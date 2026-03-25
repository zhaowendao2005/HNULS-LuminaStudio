import { randomUUID } from 'crypto'
import type {
  NormalChatAgentDecisionRecord,
  NormalChatAgentHelperInvocationRecord,
  NormalChatConversationPromptMessage,
  NormalChatFunctionCallMessagePart
} from '@preload/types'
import type {
  NormalChatAgentExecutionServices,
  NormalChatAgentGraphTemplate,
  NormalChatAgentRunResult,
  NormalChatAgentSessionState,
  NormalChatFrameworkHelperResult,
  NormalChatGraphFramework,
  NormalChatPlannerDecision
} from '../agent/contracts'
import { createChildAgentSession } from './task-dispatcher'
import { NormalChatAgentTreeStore } from './agent-tree-store'
import { NormalChatRuntimeEventSink } from './event-sink'
import { getPlannerStepLimit } from './runtime-budget'

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
    .filter((message): message is NormalChatConversationPromptMessage => message !== null)
}

function buildDecisionRecord(
  stepIndex: number,
  decision: NormalChatPlannerDecision
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
    helperArgsJson: decision.helperArgs ? JSON.stringify(decision.helperArgs, null, 2) : null,
    childGoal: decision.childTask?.goal ?? null,
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

    const framework = this.createFramework()
    const rootOutcome = await this.graph.run(rootSession, framework)
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

  private createFramework(): NormalChatGraphFramework {
    return {
      services: this.services,
      beginAgent: (session) => {
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
      },
      syncAgent: (session, patch) => {
        this.treeStore.updateAgent(session.agentId, patch)
      },
      recordDecision: (session, stepIndex, decision) => {
        this.treeStore.recordDecision(session.agentId, buildDecisionRecord(stepIndex, decision))
      },
      executeHelper: async (session, helperId, helperArgs, decisionReason) => {
        const helper = this.services.functioncallRegistry.requireHelper(helperId)
        const parsedArgs = helper.argsSchema.parse(helperArgs)
        const callId = randomUUID()
        const argsJson = JSON.stringify(helperArgs, null, 2)
        const startedAt = new Date().toISOString()

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

        this.treeStore.setSelectedHelpers(session.agentId, [
          {
            helperId: helper.id,
            displayName: helper.displayName,
            reason: decisionReason
          }
        ])
        this.treeStore.startHelperInvocation(session.agentId, callRecord)

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
          decisionReason
        }

        if (session.depth === 0) {
          this.eventSink.emitRootHelperPart(session.requestId, session.topicId, basePart)
        }

        try {
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
          const summary = helper.summarizeResult(result)

          this.treeStore.finishHelperInvocation(session.agentId, callId, {
            status: 'success',
            outputJson,
            resultSummary: summary,
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
            helper,
            callId,
            outputJson,
            summary
          } satisfies NormalChatFrameworkHelperResult
        } catch (error) {
          const message = helper.summarizeFailure(error)
          this.treeStore.finishHelperInvocation(session.agentId, callId, {
            status: 'error',
            errorMessage: message,
            failureSummary: message,
            completedAt: new Date().toISOString()
          })

          if (session.depth === 0) {
            this.eventSink.emitRootHelperPart(session.requestId, session.topicId, {
              ...basePart,
              status: 'error',
              errorMessage: message,
              isStreaming: false
            })
          }

          throw new Error(message)
        }
      },
      dispatchChild: async (parentSession, task, overrideCallMode) => {
        const childSession = createChildAgentSession(
          parentSession,
          task,
          parentSession.providerProtocol,
          overrideCallMode
        )

        const childOutcome = await this.graph.run(childSession, this.createFramework())
        return {
          summary: childOutcome.summary
        }
      },
      completeAgent: (session, status, finalResult, errorMessage) => {
        this.treeStore.finalizeAgent(session.agentId, status, finalResult, errorMessage)
      },
      markFallback: () => {
        this.treeStore.markFallback()
      },
      getStepLimit: (session) => getPlannerStepLimit(session)
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
