import { randomUUID } from 'crypto'
import type {
  NormalChatAgentDecisionRecord,
  NormalChatAgentHelperInvocationRecord,
  NormalChatAgentToolSelection,
  NormalChatConversationPromptMessage,
  NormalChatFunctionCallMessagePart
} from '@preload/types'
import type {
  NormalChatAgentExecutionServices,
  NormalChatAgentGraphTemplate,
  NormalChatAgentRunResult,
  NormalChatAgentSessionState,
  NormalChatChildTaskPayload
} from '../agent/contracts'
import { canDispatchChild, getPlannerStepLimit } from './runtime-budget'
import { createChildAgentSession } from './task-dispatcher'
import { NormalChatAgentTreeStore } from './agent-tree-store'
import { NormalChatRuntimeEventSink } from './event-sink'

interface RunRootAgentParams {
  requestId: string
  topicId: string
  assistantId: string
  assistantTitle: string
  topicTitle: string
  providerId: string
  modelId: string
  systemPrompt: string
  input: string
  signal: AbortSignal
  callMode: NormalChatAgentSessionState['callMode']
  costMode: NormalChatAgentSessionState['costMode']
  maxRecursionDepth: number
  maxRetriesPerAgent: number
}

interface AgentExecutionOutcome {
  summary: string
}

function mapConversationToPromptWindow(
  messages: ReturnType<NormalChatAgentExecutionServices['getConversationMessages']>
): NormalChatConversationPromptMessage[] {
  return messages
    .map((message) => {
      const text = message.parts
        .filter((part) => part.kind === 'text')
        .map((part) => part.text)
        .join('')
      if (!text) {
        return null
      }

      return {
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: text
      }
    })
    .filter((message) => message !== null) as NormalChatConversationPromptMessage[]
}

function buildToolSelection(
  helperId: string,
  displayName: string,
  reason: string
): NormalChatAgentToolSelection {
  return {
    helperId,
    displayName,
    reason
  }
}

function buildDecisionRecord(
  stepIndex: number,
  decision: {
    action: NormalChatAgentDecisionRecord['action']
    rawText: string
    parsedJson: string | null
    repairAttempted: boolean
    validationError: string | null
    reasoning: string
    helperId: string | null
    helperArgsJson: string | null
    childGoal: string | null
  }
): NormalChatAgentDecisionRecord {
  return {
    stepIndex,
    action: decision.action,
    rawText: decision.rawText,
    parsedJson: decision.parsedJson,
    repairAttempted: decision.repairAttempted,
    validationError: decision.validationError,
    reasoning: decision.reasoning,
    helperId: decision.helperId,
    helperArgsJson: decision.helperArgsJson,
    childGoal: decision.childGoal,
    createdAt: new Date().toISOString()
  }
}

export class NormalChatAgentSessionManager {
  constructor(
    private readonly graph: NormalChatAgentGraphTemplate,
    private readonly services: NormalChatAgentExecutionServices,
    private readonly treeStore: NormalChatAgentTreeStore,
    private readonly eventSink: NormalChatRuntimeEventSink
  ) {}

  async runRootAgent(params: RunRootAgentParams): Promise<NormalChatAgentRunResult> {
    const providerProtocol = await this.services.getProviderProtocol(
      params.providerId,
      params.signal
    )
    const conversationMessages = this.services.getConversationMessages(params.topicId)
    const rootSession: NormalChatAgentSessionState = {
      requestId: params.requestId,
      topicId: params.topicId,
      assistantId: params.assistantId,
      assistantTitle: params.assistantTitle,
      topicTitle: params.topicTitle,
      providerId: params.providerId,
      modelId: params.modelId,
      providerProtocol,
      systemPrompt: params.systemPrompt,
      input: params.input,
      signal: params.signal,
      agentId: randomUUID(),
      parentAgentId: null,
      depth: 0,
      roleKind: 'director',
      taskKind: 'user-request',
      goal: params.input,
      summary: '处理用户当前请求',
      callMode: params.callMode,
      costMode: params.costMode,
      retryCount: 0,
      maxRetries: params.maxRetriesPerAgent,
      maxRecursionDepth: params.maxRecursionDepth,
      conversationWindow: mapConversationToPromptWindow(conversationMessages)
    }

    const rootOutcome = await this.runAgent(rootSession)
    const answerMessages = await this.graph.buildAnswerMessages(rootSession, {
      conversationMessages,
      synthesisSummary: this.buildSynthesisSummary(rootOutcome.summary)
    })

    return {
      rootSession,
      synthesisSummary: rootOutcome.summary,
      answerMessages,
      agentTree: this.treeStore.getSnapshot()
    }
  }

  private async runAgent(session: NormalChatAgentSessionState): Promise<AgentExecutionOutcome> {
    this.treeStore.createAgent({
      agentId: session.agentId,
      parentAgentId: session.parentAgentId,
      depth: session.depth,
      roleKind: session.roleKind,
      taskKind: session.taskKind,
      goal: session.goal,
      summary: session.summary,
      callMode: session.callMode,
      costMode: session.costMode,
      retryCount: session.retryCount,
      conversationWindow: session.conversationWindow
    })

    let localWindow = [...session.conversationWindow]
    let currentRetryCount = session.retryCount
    let latestSummary = session.summary
    const stepLimit = getPlannerStepLimit(session)

    for (let stepIndex = 1; stepIndex <= stepLimit; stepIndex += 1) {
      const workingSession: NormalChatAgentSessionState = {
        ...session,
        retryCount: currentRetryCount,
        conversationWindow: localWindow,
        summary: latestSummary
      }

      this.treeStore.updateAgent(workingSession.agentId, {
        retryCount: currentRetryCount,
        summary: latestSummary,
        conversationWindow: localWindow,
        status: 'running'
      })

      const decision = await this.graph.decide(workingSession)
      this.treeStore.recordDecision(
        workingSession.agentId,
        buildDecisionRecord(stepIndex, {
          action: decision.action,
          rawText: decision.rawText,
          parsedJson: decision.parsedJson,
          repairAttempted: decision.repairAttempted,
          validationError: decision.validationError,
          reasoning: decision.reasoning,
          helperId: decision.helperId,
          helperArgsJson: decision.helperArgs ? JSON.stringify(decision.helperArgs, null, 2) : null,
          childGoal: decision.childTask?.goal ?? null
        })
      )

      if (decision.action === 'answer') {
        const finalSummary = decision.finalAnswerHint || decision.reasoning || latestSummary
        this.treeStore.finalizeAgent(workingSession.agentId, 'completed', finalSummary, null)
        return { summary: finalSummary }
      }

      if (decision.action === 'fallback') {
        const finalSummary = decision.reasoning || latestSummary
        this.treeStore.markFallback()
        this.treeStore.finalizeAgent(workingSession.agentId, 'fallback', finalSummary, null)
        return { summary: finalSummary }
      }

      if (decision.action === 'call-helper' && decision.helperId) {
        const helperResult = await this.executeHelperDecision(
          workingSession,
          decision.helperId,
          decision.reasoning,
          decision.helperArgs ?? {}
        )

        if (helperResult.retry) {
          currentRetryCount += 1
          latestSummary = helperResult.summary
          localWindow = [
            ...localWindow,
            {
              role: 'assistant',
              content: `上一步失败，需要更保守地重试：${helperResult.summary}`
            }
          ]
          continue
        }

        latestSummary = helperResult.summary
        localWindow = [
          ...localWindow,
          {
            role: 'assistant',
            content: `helper 结果摘要：${helperResult.summary}`
          }
        ]
        continue
      }

      if (decision.action === 'dispatch-child' && decision.childTask) {
        if (!canDispatchChild(workingSession)) {
          this.treeStore.markFallback()
          const finalSummary = `已达到递归深度上限，当前在第 ${workingSession.depth} 层直接收口。`
          this.treeStore.finalizeAgent(workingSession.agentId, 'fallback', finalSummary, null)
          return { summary: finalSummary }
        }

        const childSession = createChildAgentSession(
          workingSession,
          decision.childTask,
          workingSession.providerProtocol
        )
        const childResult = await this.runAgent(childSession)
        latestSummary = childResult.summary
        localWindow = [
          ...localWindow,
          {
            role: 'assistant',
            content: `子 agent 回传摘要：${childResult.summary}`
          }
        ]
        continue
      }
    }

    const finalSummary = `当前 agent 在 ${stepLimit} 步内没有自然收口，按保守模式结束。`
    this.treeStore.markFallback()
    this.treeStore.finalizeAgent(session.agentId, 'fallback', finalSummary, null)
    return { summary: finalSummary }
  }

  private async executeHelperDecision(
    session: NormalChatAgentSessionState,
    helperId: string,
    reasoning: string,
    helperArgs: Record<string, unknown>
  ): Promise<{ summary: string; retry: boolean }> {
    const helper = this.services.functioncallRegistry.requireHelper(helperId)
    this.treeStore.setSelectedHelpers(session.agentId, [
      buildToolSelection(helper.id, helper.displayName, reasoning)
    ])

    try {
      const parsedArgs = helper.argsSchema.parse(helperArgs)
      const callId = randomUUID()
      const argsJson = JSON.stringify(helperArgs, null, 2)
      const startedAt = new Date().toISOString()
      const basePart: NormalChatFunctionCallMessagePart = {
        kind: 'functioncall',
        callId,
        functionCallName: helper.id,
        title: helper.displayName,
        status: 'running',
        input: argsJson,
        output: '',
        errorMessage: null,
        isStreaming: true,
        roundIndex: 0,
        batchIndex: 0,
        parallelIndex: 0,
        depth: session.depth,
        decisionReason: reasoning
      }

      const callRecord: NormalChatAgentHelperInvocationRecord = {
        callId,
        helperId: helper.id,
        displayName: helper.displayName,
        status: 'running',
        argsJson,
        outputJson: '',
        errorMessage: null,
        resultSummary: null,
        failureSummary: null,
        startedAt,
        completedAt: null
      }

      this.treeStore.startHelperInvocation(session.agentId, callRecord)
      if (session.depth === 0) {
        this.eventSink.emitRootHelperPart(session.requestId, session.topicId, basePart)
      }

      const result = await helper.execute(parsedArgs, {
        requestId: session.requestId,
        topicId: session.topicId,
        agentId: session.agentId,
        depth: session.depth,
        providerId: session.providerId,
        modelId: session.modelId,
        signal: session.signal,
        logger: this.services.logger
      })

      const outputJson = JSON.stringify(result, null, 2)
      const resultSummary = helper.summarizeResult(result)
      this.treeStore.finishHelperInvocation(session.agentId, callId, {
        status: 'success',
        outputJson,
        resultSummary,
        completedAt: new Date().toISOString()
      })

      if (session.depth === 0) {
        this.eventSink.emitRootHelperPart(session.requestId, session.topicId, {
          ...basePart,
          status: 'success',
          output: outputJson,
          isStreaming: false
        })
      }

      return {
        summary: resultSummary,
        retry: false
      }
    } catch (error) {
      const message = helper.summarizeFailure(error)

      if (session.retryCount < session.maxRetries) {
        this.treeStore.updateAgent(session.agentId, {
          retryCount: session.retryCount + 1
        })
        return {
          summary: `${helper.displayName} 调用失败，准备重试。原因：${message}`,
          retry: true
        }
      }

      if (session.roleKind !== 'repair' && canDispatchChild(session)) {
        const repairTask: NormalChatChildTaskPayload = {
          roleKind: 'repair',
          taskKind: 'repair',
          goal: `修复 helper ${helper.displayName} 失败问题，并给出更稳妥的下一步建议。错误：${message}`,
          summary: `helper ${helper.id} 失败，需要 repair`
        }

        const repairSession = createChildAgentSession(
          session,
          repairTask,
          session.providerProtocol,
          'slow'
        )
        const repairResult = await this.runAgent(repairSession)
        return {
          summary: repairResult.summary,
          retry: false
        }
      }

      this.treeStore.markFallback()
      this.treeStore.finalizeAgent(session.agentId, 'fallback', null, message)
      return {
        summary: `${helper.displayName} 失败，当前只能保守降级。原因：${message}`,
        retry: false
      }
    }
  }

  private buildSynthesisSummary(rootSummary: string): string {
    const tree = this.treeStore.getSnapshot()
    const lines = Object.values(tree.agents)
      .sort((left, right) => left.depth - right.depth)
      .flatMap((agent) => {
        const helperLines = agent.helperInvocations.map((call) => {
          return `- helper ${call.displayName}: ${call.resultSummary ?? call.failureSummary ?? call.status}`
        })

        return [
          `Agent(depth=${agent.depth}, role=${agent.roleKind}, task=${agent.taskKind}, status=${agent.status})`,
          `Goal: ${agent.goal}`,
          `Summary: ${agent.finalResult ?? agent.summary}`,
          ...(helperLines.length > 0 ? helperLines : [])
        ]
      })

    return [`根结论：${rootSummary}`, '', '运行树摘要：', ...lines].join('\n')
  }
}
