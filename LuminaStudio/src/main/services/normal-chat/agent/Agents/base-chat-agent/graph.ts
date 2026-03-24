import { randomUUID } from 'crypto'
import { HumanMessage, SystemMessage, AIMessage, type BaseMessage } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogle } from '@langchain/google'
import { ChatOpenAI, ChatOpenAICompletions, ChatOpenAIResponses } from '@langchain/openai'
import { z } from 'zod'
import type {
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

const PUBMED_PLANNER_SCHEMA = z.object({
  mode: z.enum(['tool', 'answer']),
  reason: z.string().optional(),
  pubmed: z
    .object({
      query: z.string().trim().min(1),
      topK: z.number().int().min(1).max(20).default(5),
      sort: z.enum(['relevance', 'pub_date']).default('relevance'),
      startDate: z.string().trim().min(1).optional(),
      endDate: z.string().trim().min(1).optional()
    })
    .optional()
})

type PubmedPlannerOutput = z.infer<typeof PUBMED_PLANNER_SCHEMA>

type SupportedChatModel =
  | ChatOpenAI
  | ChatOpenAIResponses
  | ChatOpenAICompletions
  | ChatAnthropic
  | ChatGoogle

type FunctionCallingChatModel = SupportedChatModel & {
  withStructuredOutput: (
    schema: typeof PUBMED_PLANNER_SCHEMA,
    config: { name: string; method: 'functionCalling' }
  ) => {
    invoke: (
      input: Array<SystemMessage | HumanMessage | AIMessage>,
      options?: { signal?: AbortSignal }
    ) => Promise<PubmedPlannerOutput>
  }
}

const MAX_TOOL_ROUNDS = 2

export class BaseChatAgentGraph implements NormalChatAgentGraphRunner {
  constructor(private readonly options: BaseChatAgentGraphOptions) {}

  async run(context: NormalChatAgentRunContext): Promise<BaseChatAgentGraphRunResult> {
    const trace = this.options.trace
    // 先从 runtime 拉取当前话题历史，再把历史和 system prompt 组装成模型输入。
    const conversationMessages = this.options.runtime.getConversationMessages(context.topicId)
    const promptMessages = this.buildPromptMessages(context, conversationMessages)
    // 先判断 provider 协议，openai-response 走 Responses API 的结构化输出适配。
    const providerProtocol = await this.options.runtime.getProviderProtocol(
      context.providerId,
      context.signal
    )

    // 这里用统一的模型工厂创建 chat model，graph 不直接关心 provider 的底层实现。
    const model =
      providerProtocol === 'openai-response'
        ? null
        : ((await this.options.runtime.createChatModel(
            context.providerId,
            context.modelId,
            context.signal
          )) as FunctionCallingChatModel)

    trace?.record({
      type: 'run-start',
      requestId: context.requestId,
      topicId: context.topicId,
      assistantId: context.assistantId,
      modelId: context.modelId,
      message: 'BaseChatAgentGraph 开始执行'
    })

    const planner =
      providerProtocol === 'openai-response'
        ? null
        : model.withStructuredOutput(PUBMED_PLANNER_SCHEMA, {
            name: 'normal_chat_pubmed_planner',
            method: 'functionCalling'
          })

    // toolHistory 只保存“已经拿到的检索摘要”，避免把原始工具结果反复塞回模型。
    const toolHistory: string[] = []
    let finalPlan: PubmedPlannerOutput | null = null

    try {
      // 这里是一个小型决策循环：先让模型判断要不要查，再根据工具结果决定是否继续补检索。
      for (let round = 1; round <= MAX_TOOL_ROUNDS && !context.signal.aborted; round += 1) {
        trace?.record({
          type: 'decision',
          requestId: context.requestId,
          topicId: context.topicId,
          step: `round-${round}`,
          message: toolHistory.length
            ? `第 ${round} 轮：基于已获得的 PubMed 结果重新判断是否需要继续检索`
            : `第 ${round} 轮：判断当前问题是否需要 PubMed 检索`
        })

        const plannerMessages = this.buildPlannerMessages(promptMessages, toolHistory, context)
        const plan =
          providerProtocol === 'openai-response'
            ? (PUBMED_PLANNER_SCHEMA.parse(
                await this.options.runtime.invokeStructuredOutput({
                  providerId: context.providerId,
                  modelId: context.modelId,
                  schema: PUBMED_PLANNER_SCHEMA,
                  schemaName: 'normal_chat_pubmed_planner',
                  messages: plannerMessages,
                  signal: context.signal
                })
              ) as PubmedPlannerOutput)
            : await planner.invoke(plannerMessages, { signal: context.signal })
        finalPlan = plan

        if (plan.mode !== 'tool' || !plan.pubmed) {
          break
        }

        trace?.record({
          type: 'tool-selected',
          requestId: context.requestId,
          topicId: context.topicId,
          toolName: 'pubmed-search',
          message: `准备调用 PubMed 检索，query=${plan.pubmed.query}`
        })

        // 真正的工具执行下沉到 agent-local functioncall facade，graph 只拿结果，不知道实现细节。
        const callId = randomUUID()
        const toolResult = await this.options.functioncalls.pubmedSearch(
          plan.pubmed,
          this.buildToolExecuteContext(context, callId)
        )
        toolHistory.push(this.summarizePubmedResult(toolResult))

        trace?.record({
          type: 'loop-next',
          requestId: context.requestId,
          topicId: context.topicId,
          nextStep: round < MAX_TOOL_ROUNDS ? 're-plan' : 'answer',
          message:
            round < MAX_TOOL_ROUNDS
              ? '工具结果已拿到，继续进入下一轮判断'
              : '工具轮次已到上限，转入最终回答'
        })
      }

      const answerMessages = this.buildAnswerMessages(
        promptMessages,
        toolHistory,
        finalPlan,
        context
      )

      return {
        answerMessages,
        promptMessages: answerMessages.map((message) => this.toPromptMessage(message))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
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
    // promptMessages 的第 0 条固定是 system prompt，后面才是历史消息。
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
    toolHistory: string[],
    context: NormalChatAgentRunContext
  ): Array<SystemMessage | HumanMessage | AIMessage> {
    const system = new SystemMessage(
      [
        promptMessages[0]?.content ?? this.buildBaseSystemPrompt(context),
        '',
        '你现在是一个决策器，只负责判断是否需要 PubMed 检索。',
        '如果要检索，请给出明确 query，必要时给出排序和条数。',
        '如果不需要检索，直接返回 mode=answer。',
        '',
        '当前仅有的工具：PubMed 论文检索。'
      ].join('\n')
    )

    // planner 阶段只做“是否调用工具”的判断，不直接输出最终答案。
    const messages: Array<SystemMessage | HumanMessage | AIMessage> = [system]
    const historyMessages = promptMessages
      .slice(1)
      .map((message) => this.toLangChainMessage(message))
    messages.push(...historyMessages)

    if (toolHistory.length > 0) {
      messages.push(
        new HumanMessage(
          [
            '上一轮 PubMed 检索结果摘要：',
            ...toolHistory.map((item, index) => `${index + 1}. ${item}`),
            '',
            '请基于这些结果继续判断是否还要补检索。'
          ].join('\n')
        )
      )
    }

    return messages
  }

  private buildAnswerMessages(
    promptMessages: NormalChatConversationPromptMessage[],
    toolHistory: string[],
    finalPlan: PubmedPlannerOutput | null,
    context: NormalChatAgentRunContext
  ): Array<SystemMessage | HumanMessage | AIMessage> {
    const toolSummary = toolHistory.length
      ? toolHistory.map((item, index) => `- 第 ${index + 1} 轮：${item}`).join('\n')
      : '本轮未调用 PubMed 检索。'

    // answer 阶段把历史、工具摘要和规划结论一起交给模型，让它生成最终可读回答。
    const system = new SystemMessage(
      [
        promptMessages[0]?.content ?? this.buildBaseSystemPrompt(context),
        '',
        '请根据聊天历史和 PubMed 检索结果给出最终回答。',
        '不要解释内部决策过程，不要暴露工具调用细节。',
        '如果检索结果不足，请明确说明不足。',
        '',
        '检索摘要：',
        toolSummary,
        '',
        `规划结论：${finalPlan?.reason || '无'}`
      ].join('\n')
    )

    return [system, ...promptMessages.slice(1).map((message) => this.toLangChainMessage(message))]
  }

  private buildToolExecuteContext(
    context: NormalChatAgentRunContext,
    callId: string
  ): NormalChatAgentToolExecuteContext {
    // 工具上下文只保留执行时真正需要的最小信息，避免把 runtime 的业务对象泄露出去。
    return {
      signal: context.signal,
      trace: this.options.trace ?? this.createFallbackTraceRecorder(),
      runContext: context,
      modelContext: {
        providerId: context.providerId,
        modelId: context.modelId
      },
      logger: this.options.runtime.logger,
      callId
    }
  }

  private buildBaseSystemPrompt(context: NormalChatAgentRunContext): string {
    // 这一段是 base agent 的基础行为约束，后续如果换 agent，只需要换这里的 prompt 逻辑。
    const lines = [
      context.systemPrompt || '你是 LuminaStudio 的基础聊天 agent。',
      '',
      '你需要先判断是否要调用工具，再决定是否继续循环。',
      '你当前只有一个可用工具：PubMed 论文检索。',
      '如果需要检索，请优先给出明确的检索词，再根据结果回答。',
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
    // 只保留有文本内容的历史消息，并统一转换成 assistant / user 两种角色。
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

  private summarizePubmedResult(result: PubmedSearchExecutionResult): string {
    if (result.items.length === 0) {
      return `PubMed 未找到结果：${result.query}`
    }

    // 这里只保留最前面的几条结果摘要，避免 prompt 被原始检索结果撑爆。
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
    // 把内部 prompt DTO 转成 LangChain message，方便 planner / answer 阶段复用。
    if (message.role === 'system') {
      return new SystemMessage(message.content)
    }

    if (message.role === 'assistant') {
      return new AIMessage(message.content)
    }

    return new HumanMessage(message.content)
  }

  private toPromptMessage(message: BaseMessage): NormalChatConversationPromptMessage {
    // 把模型输出再转回 normal-chat 自己的 prompt DTO，方便上层落库和 trace 复用。
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
    // LangChain 的 content 可能是 string，也可能是分段数组，这里统一压成纯文本。
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

  private createFallbackTraceRecorder(): NormalChatAgentTraceRecorder {
    return {
      // graph 只有在工具执行时才需要 trace，这里兜底避免上下文缺失。
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
