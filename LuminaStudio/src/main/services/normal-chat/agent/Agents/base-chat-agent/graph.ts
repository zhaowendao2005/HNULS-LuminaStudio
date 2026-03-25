import { randomUUID } from 'crypto'
import { HumanMessage, SystemMessage, AIMessage, type BaseMessage } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogle } from '@langchain/google'
import { ChatOpenAI, ChatOpenAICompletions, ChatOpenAIResponses } from '@langchain/openai'
import { z } from 'zod'
import type {
  NormalChatAgentExecutionRoundRecord,
  NormalChatAgentExecutionToolCallRecord,
  NormalChatAgentExecutionTrace,
  NormalChatAgentExecutionToolCall,
  NormalChatConversationMessage,
  NormalChatConversationPromptMessage
} from '@preload/types'
import type {
  NormalChatAgentGraphRunResult,
  NormalChatAgentGraphRuntimeBridge,
  NormalChatAgentGraphRunner,
  NormalChatAgentRunContext,
  NormalChatAgentTraceRecorder,
  NormalChatAgentToolExecuteContext
} from '../../contracts'
import type { BaseChatAgentFunctioncallSuite, PubmedSearchExecutionResult } from './functioncall'

export interface BaseChatAgentGraphOptions {
  runtime: NormalChatAgentGraphRuntimeBridge
  functioncalls: BaseChatAgentFunctioncallSuite
  trace?: NormalChatAgentTraceRecorder
}

export type BaseChatAgentGraphRunResult = NormalChatAgentGraphRunResult

const PUBMED_TOOL_CALL_SCHEMA = z.object({
  toolName: z.literal('pubmed-search'),
  title: z.string().trim().min(1).default('PubMed 论文检索'),
  reason: z.string().trim().min(1).optional(),
  pubmed: z.object({
    query: z.string().trim().min(1),
    topK: z.number().int().min(1).max(20).default(5),
    sort: z.enum(['relevance', 'pub_date']).default('relevance'),
    startDate: z.string().trim().min(1).optional(),
    endDate: z.string().trim().min(1).optional()
  })
})

const AGENT_DECISION_SCHEMA = z.object({
  mode: z.enum(['tool', 'answer']),
  reason: z.string().trim().min(1).optional(),
  toolCalls: z.array(PUBMED_TOOL_CALL_SCHEMA).default([])
})

type AgentDecisionOutput = z.infer<typeof AGENT_DECISION_SCHEMA>
type AgentToolCall = z.infer<typeof PUBMED_TOOL_CALL_SCHEMA>

type SupportedChatModel =
  | ChatOpenAI
  | ChatOpenAIResponses
  | ChatOpenAICompletions
  | ChatAnthropic
  | ChatGoogle

const MAX_TOOL_ROUNDS = 4
const MAX_TOOL_CALLS_PER_ROUND = 4

function extractJsonBlock(text: string): string {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }

  return text.trim()
}

export class BaseChatAgentGraph implements NormalChatAgentGraphRunner {
  constructor(private readonly options: BaseChatAgentGraphOptions) {}

  async run(context: NormalChatAgentRunContext): Promise<BaseChatAgentGraphRunResult> {
    const trace = this.options.trace
    const conversationMessages = this.options.runtime.getConversationMessages(context.topicId)
    const promptMessages = this.buildPromptMessages(context, conversationMessages)
    await this.options.runtime.getProviderProtocol(context.providerId, context.signal)
    const model = (await this.options.runtime.createChatModel(
      context.providerId,
      context.modelId,
      context.signal
    )) as SupportedChatModel

    trace?.record({
      type: 'run-start',
      requestId: context.requestId,
      topicId: context.topicId,
      roundIndex: 0,
      assistantId: context.assistantId,
      modelId: context.modelId,
      message: 'BaseChatAgentGraph 开始执行'
    })

    const execution: NormalChatAgentExecutionTrace = {
      maxRounds: MAX_TOOL_ROUNDS,
      completed: false,
      aborted: false,
      finalMode: 'error',
      rounds: []
    }

    let finalDecision: AgentDecisionOutput | null = null

    try {
      for (
        let roundIndex = 1;
        roundIndex <= MAX_TOOL_ROUNDS && !context.signal.aborted;
        roundIndex += 1
      ) {
        const roundStartedAt = new Date().toISOString()
        const roundRecord: NormalChatAgentExecutionRoundRecord = {
          roundIndex,
          mode: 'answer',
          reason: null,
          startedAt: roundStartedAt,
          completedAt: null,
          toolCalls: []
        }
        execution.rounds.push(roundRecord)

        trace?.record({
          type: 'decision-start',
          requestId: context.requestId,
          topicId: context.topicId,
          roundIndex,
          message: `第 ${roundIndex} 轮开始决策`
        })

        const plannerMessages = this.buildPlannerMessages(promptMessages, execution.rounds, context)
        const plannerResponse = await model.invoke(plannerMessages, {
          signal: context.signal
        })
        const plannerText = this.extractPromptMessageText(plannerResponse)
        const decision = this.parsePlannerDecision(plannerText)

        finalDecision = decision
        roundRecord.mode = decision.mode
        roundRecord.reason = decision.reason ?? null

        trace?.record({
          type: 'decision-finish',
          requestId: context.requestId,
          topicId: context.topicId,
          roundIndex,
          mode: decision.mode,
          reason: decision.reason ?? null,
          message: `第 ${roundIndex} 轮决策完成，mode=${decision.mode}`
        })

        if (decision.mode !== 'tool' || decision.toolCalls.length === 0) {
          roundRecord.completedAt = new Date().toISOString()
          execution.completed = true
          execution.finalMode = 'answer'
          break
        }

        const batchIndex = roundIndex - 1
        const toolCalls: AgentToolCall[] = decision.toolCalls.slice(0, MAX_TOOL_CALLS_PER_ROUND)

        trace?.record({
          type: 'tool-batch-start',
          requestId: context.requestId,
          topicId: context.topicId,
          roundIndex,
          batchIndex,
          toolCount: toolCalls.length,
          message: `第 ${roundIndex} 轮准备并行执行 ${toolCalls.length} 个工具调用`
        })

        const callResults = await Promise.all(
          toolCalls.map(async (toolCall, parallelIndex) => {
            const callId = randomUUID()
            const callStartedAt = new Date().toISOString()
            const callRecord: NormalChatAgentExecutionToolCallRecord = {
              callId,
              toolName: toolCall.toolName,
              title: toolCall.title,
              roundIndex,
              batchIndex,
              parallelIndex,
              status: 'running',
              input: '',
              output: '',
              errorMessage: null,
              startedAt: callStartedAt,
              completedAt: null
            }
            roundRecord.toolCalls.push(callRecord)

            const decisionReason = toolCall.reason ?? decision.reason ?? null
            const input = JSON.stringify(toolCall.pubmed, null, 2)
            callRecord.input = input

            trace?.record({
              type: 'tool-selected',
              requestId: context.requestId,
              topicId: context.topicId,
              roundIndex,
              batchIndex,
              parallelIndex,
              depth: roundIndex,
              decisionReason,
              toolName: toolCall.toolName,
              message: `选中工具 ${toolCall.toolName}`
            })

            try {
              const normalizedCall: NormalChatAgentExecutionToolCall = {
                toolName: toolCall.toolName,
                title: toolCall.title,
                reason: decisionReason,
                input: toolCall.pubmed
              }
              const toolResult = await this.options.functioncalls.executeToolCall(
                normalizedCall,
                this.buildToolExecuteContext(
                  context,
                  callId,
                  roundIndex,
                  batchIndex,
                  parallelIndex,
                  decisionReason
                )
              )
              callRecord.status = 'success'
              callRecord.output = toolResult.output
              callRecord.completedAt = new Date().toISOString()

              return {
                callRecord,
                toolResult
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              callRecord.status = context.signal.aborted ? 'aborted' : 'error'
              callRecord.errorMessage = message
              callRecord.completedAt = new Date().toISOString()

              trace?.record({
                type: 'functioncall-error',
                requestId: context.requestId,
                topicId: context.topicId,
                roundIndex,
                batchIndex,
                parallelIndex,
                depth: roundIndex,
                callId,
                functionCallName: toolCall.toolName,
                title: toolCall.title,
                error: message,
                message: `${toolCall.title} 执行失败`
              })

              return {
                callRecord,
                error: message
              }
            }
          })
        )

        roundRecord.completedAt = new Date().toISOString()

        trace?.record({
          type: 'tool-batch-finish',
          requestId: context.requestId,
          topicId: context.topicId,
          roundIndex,
          batchIndex,
          toolCount: toolCalls.length,
          message: `第 ${roundIndex} 轮工具批次执行完成`
        })
        trace?.record({
          type: 'loop-next',
          requestId: context.requestId,
          topicId: context.topicId,
          roundIndex,
          nextStep: roundIndex < MAX_TOOL_ROUNDS ? 're-plan' : 'answer',
          message:
            roundIndex < MAX_TOOL_ROUNDS
              ? '工具批次执行完成，继续进入下一轮决策'
              : '工具轮次已达到上限，准备生成最终回答'
        })

        void callResults
      }

      if (!execution.completed) {
        execution.finalMode = finalDecision?.mode === 'tool' ? 'tool' : 'answer'
      }

      const answerMessages = this.buildAnswerMessages(
        promptMessages,
        execution,
        context,
        finalDecision
      )

      return {
        answerMessages,
        promptMessages: answerMessages.map((message) => this.toPromptMessage(message)),
        execution
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      execution.aborted = context.signal.aborted
      execution.finalMode = context.signal.aborted ? 'answer' : 'error'
      execution.completed = false
      trace?.record({
        type: 'run-error',
        requestId: context.requestId,
        topicId: context.topicId,
        error: message,
        message: 'BaseChatAgentGraph 执行失败'
      })
      throw error
    }
  }

  private buildPromptMessages(
    context: NormalChatAgentRunContext,
    conversationMessages: NormalChatConversationMessage[]
  ): NormalChatConversationPromptMessage[] {
    return [
      {
        role: 'system',
        content: this.buildBaseSystemPrompt(context)
      },
      ...this.buildConversationHistory(conversationMessages)
    ]
  }

  private buildPlannerMessages(
    promptMessages: NormalChatConversationPromptMessage[],
    rounds: NormalChatAgentExecutionRoundRecord[],
    context: NormalChatAgentRunContext
  ): Array<SystemMessage | HumanMessage | AIMessage> {
    const system = new SystemMessage(
      [
        promptMessages[0]?.content ?? this.buildBaseSystemPrompt(context),
        '',
        '你现在是一个自主决策器，只负责判断是否需要调用工具。',
        '如果要调用工具，可以一次返回多个 toolCalls，用于并行检索。',
        '如果不需要检索，直接返回 mode=answer。',
        '你必须只返回一个 JSON 对象，不要输出解释、不要输出 Markdown、不要输出代码块前后的额外文字。',
        '返回格式必须是：{"mode":"tool|answer","reason":"...","toolCalls":[...]}。',
        '当 mode=answer 时，toolCalls 必须是空数组。',
        '',
        '当前可用工具：PubMed 论文检索。'
      ].join('\n')
    )

    const messages: Array<SystemMessage | HumanMessage | AIMessage> = [system]
    const historyMessages = promptMessages
      .slice(1)
      .map((message) => this.toLangChainMessage(message))
    messages.push(...historyMessages)

    if (rounds.length > 0) {
      messages.push(
        new HumanMessage(
          [
            '最近几轮工具执行摘要：',
            ...rounds.map((round) => this.formatRoundSummary(round)),
            '',
            '请基于这些结果继续判断是否还要补充检索。'
          ].join('\n')
        )
      )
    }

    return messages
  }

  private buildAnswerMessages(
    promptMessages: NormalChatConversationPromptMessage[],
    execution: NormalChatAgentExecutionTrace,
    context: NormalChatAgentRunContext,
    finalDecision: AgentDecisionOutput | null
  ): Array<SystemMessage | HumanMessage | AIMessage> {
    const executionSummary =
      execution.rounds.length > 0
        ? execution.rounds.map((round) => this.formatRoundSummary(round)).join('\n\n')
        : '本轮未调用 PubMed 检索。'

    const system = new SystemMessage(
      [
        promptMessages[0]?.content ?? this.buildBaseSystemPrompt(context),
        '',
        '请根据聊天历史、工具执行过程和检索结果给出最终回答。',
        '不要解释内部决策过程，不要暴露工具调用细节。',
        '如果检索结果不足，请明确说明不足。',
        '',
        '执行摘要：',
        executionSummary,
        '',
        `最终规划结论：${finalDecision?.reason || '无'}`,
        execution.completed ? '' : '注意：工具循环未自然收束，当前回答基于可用结果生成。'
      ]
        .filter(Boolean)
        .join('\n')
    )

    return [system, ...promptMessages.slice(1).map((message) => this.toLangChainMessage(message))]
  }

  private buildToolExecuteContext(
    context: NormalChatAgentRunContext,
    callId: string,
    roundIndex: number,
    batchIndex: number,
    parallelIndex: number,
    decisionReason: string | null
  ): NormalChatAgentToolExecuteContext {
    return {
      signal: context.signal,
      trace: this.options.trace ?? this.createFallbackTraceRecorder(),
      runContext: context,
      modelContext: {
        providerId: context.providerId,
        modelId: context.modelId
      },
      logger: this.options.runtime.logger,
      callId,
      roundIndex,
      batchIndex,
      parallelIndex,
      depth: roundIndex,
      decisionReason
    }
  }

  private buildBaseSystemPrompt(context: NormalChatAgentRunContext): string {
    const lines = [
      context.systemPrompt || '你是 LuminaStudio 的基础聊天 agent。',
      '',
      '你需要先判断是否要调用工具，再决定是否继续循环。',
      '你当前只有一个可用工具：PubMed 论文检索。',
      '如果需要检索，可以一次返回多个 toolCalls，并尽量并行覆盖不同检索角度。',
      '回答时尽量使用中文，结构清晰，不要把内部决策直接暴露给用户。'
    ]

    if (context.topicTitle) {
      lines.splice(1, 0, `当前话题：${context.topicTitle}`)
    }

    if (context.assistantTitle) {
      lines.splice(1, 0, `当前助手：${context.assistantTitle}`)
    }

    return lines.join('\n')
  }

  private buildConversationHistory(
    conversationMessages: NormalChatConversationMessage[]
  ): NormalChatConversationPromptMessage[] {
    return conversationMessages
      .map((message) => {
        const text = this.extractMessageText(message)
        if (!text) {
          return null
        }

        return {
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: text
        }
      })
      .filter(
        (
          item
        ): item is Extract<NormalChatConversationPromptMessage, { role: 'user' | 'assistant' }> =>
          item !== null
      )
  }

  private formatRoundSummary(round: NormalChatAgentExecutionRoundRecord): string {
    const head = [
      `第 ${round.roundIndex} 轮`,
      `mode=${round.mode}`,
      `reason=${round.reason || '无'}`
    ]
    const body = round.toolCalls.length
      ? round.toolCalls.map((call) => this.formatToolCallSummary(call)).join('\n')
      : '未执行工具调用'

    return [...head, body].join('\n')
  }

  private formatToolCallSummary(call: NormalChatAgentExecutionToolCallRecord): string {
    const prefix = `- [${call.roundIndex}.${call.batchIndex + 1}.${call.parallelIndex + 1}] ${call.title}`
    if (call.status === 'success') {
      const result = this.safeSummarizePubmedOutput(call.output)
      return `${prefix} 成功：${result}`
    }

    if (call.status === 'aborted') {
      return `${prefix} 已中止`
    }

    return `${prefix} 失败：${call.errorMessage || '未知错误'}`
  }

  private safeSummarizePubmedOutput(output: string): string {
    try {
      const parsed = JSON.parse(output) as PubmedSearchExecutionResult
      return this.summarizePubmedResult(parsed)
    } catch {
      return output.slice(0, 160)
    }
  }

  private summarizePubmedResult(result: PubmedSearchExecutionResult): string {
    if (result.items.length === 0) {
      return `PubMed 未找到结果：${result.query}`
    }

    const topItems = result.items.slice(0, 3).map((item, index) => {
      const authors = item.authors.length > 0 ? item.authors.join('，') : '未知作者'
      const date = item.pub_date || '未知日期'
      return `${index + 1}. ${item.title || '未命名文献'} | ${item.source || '未知来源'} | ${date} | ${authors}`
    })

    return [`PubMed 检索词：${result.query}`, ...topItems].join('； ')
  }

  private extractMessageText(message: NormalChatConversationMessage): string {
    return message.parts
      .filter((part) => part.kind === 'text')
      .map((part) => part.text)
      .join('')
  }

  private toLangChainMessage(
    message: NormalChatConversationPromptMessage
  ): SystemMessage | HumanMessage | AIMessage {
    if (message.role === 'system') {
      return new SystemMessage(message.content)
    }

    if (message.role === 'assistant') {
      return new AIMessage(message.content)
    }

    return new HumanMessage(message.content)
  }

  private toPromptMessage(message: BaseMessage): NormalChatConversationPromptMessage {
    if (message instanceof SystemMessage) {
      return {
        role: 'system',
        content: this.extractPromptMessageText(message)
      }
    }

    if (message instanceof AIMessage) {
      return {
        role: 'assistant',
        content: this.extractPromptMessageText(message)
      }
    }

    return {
      role: 'user',
      content: this.extractPromptMessageText(message)
    }
  }

  private extractPromptMessageText(message: BaseMessage): string {
    if (typeof message.content === 'string') {
      return message.content
    }

    if (Array.isArray(message.content)) {
      return message.content
        .map((item) => {
          if (typeof item === 'string') {
            return item
          }

          if (typeof item === 'object' && item && 'text' in item && typeof item.text === 'string') {
            return item.text
          }

          return ''
        })
        .join('')
    }

    return String(message.content ?? '')
  }

  private parsePlannerDecision(rawText: string): AgentDecisionOutput {
    const normalized = extractJsonBlock(rawText)

    try {
      return AGENT_DECISION_SCHEMA.parse(JSON.parse(normalized)) as AgentDecisionOutput
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(
        `Agent planner 返回的 JSON 不合法：${message}。原始内容：${rawText.slice(0, 400)}`
      )
    }
  }

  private createFallbackTraceRecorder(): NormalChatAgentTraceRecorder {
    return {
      record() {
        return undefined
      },
      snapshot() {
        return []
      },
      subscribe() {
        return () => undefined
      }
    }
  }
}
