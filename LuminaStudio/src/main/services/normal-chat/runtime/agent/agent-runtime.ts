import { randomUUID } from 'node:crypto'
import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatConversationRuntimeTrace,
  NormalChatConversationTurnResponseRecord,
  NormalChatFunctionCallMessagePart,
  NormalChatTopic
} from '@preload/types'
import type { NormalChatResolvedConversation } from '../../conversation/conversation-config-service'
import { NormalChatActionRunsRepository } from '../../repositories/action-runs.repository'
import {
  NormalChatAgentRunsRepository,
  type NormalChatAgentRunRecord
} from '../../repositories/agent-runs.repository'
import { NormalChatMessagesRepository } from '../../repositories/messages.repository'
import { NormalChatTasksRepository } from '../../repositories/tasks.repository'
import { NormalChatTurnTracesRepository } from '../../repositories/turn-traces.repository'
import { nowIso } from '../../shared/utils'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import { NormalChatActionExecutorService } from '../actions/shared/action-executor.service'
import { NormalChatActionResolutionService } from '../actions/shared/action-resolution.service'
import { NormalChatLoadedActionSpecService } from '../actions/shared/loaded-action-spec.service'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'
import type {
  NormalChatDispatchSubAgentExecutionInput,
  NormalChatDispatchSubAgentOutput,
  NormalChatDispatchSubAgentRunner
} from '../actions/system/dispatch-sub-agent'
import { NormalChatOutputEnvelopeParser } from './graph/output-envelope-parser'
import type { NormalChatAgentRoundEnvelope } from './graph/output-envelope.types'
import { NormalChatAgentGraphRunner } from './graph/runner'
import type { NormalChatAgentGraphState } from './graph/states'
import type { NormalChatPromptBundle } from '../llm/model-adapter.interface'
import type { NormalChatModelAdapter } from '../llm/model-adapter.interface'
import { NormalChatPromptBuilder } from '../prompt/prompt-builder'
import { NormalChatStreamPublisher } from '../streaming/stream-publisher'
import { NormalChatRoundPersistenceService } from './round-persistence.service'

export interface NormalChatAgentRuntimeStartInput {
  taskId: string
  requestId: string
  topicId: string
  conversation: NormalChatResolvedConversation
  assistant: NormalChatAssistant
  topic: NormalChatTopic
  userInput: string
  providerId: string
  modelId: string
  rootAgentRun: NormalChatAgentRunRecord
  signal: AbortSignal
}

interface AgentExecutionOverrides {
  allowedActionKeys?: string[]
  pubmedMode?: 'fast' | 'slow'
  maxReactSteps?: number
}

interface AgentExecutionInput {
  taskId: string
  requestId: string
  topicId: string
  conversation: NormalChatResolvedConversation
  assistant: NormalChatAssistant
  topic: NormalChatTopic
  userInput: string
  providerId: string
  modelId: string
  agentRun: NormalChatAgentRunRecord
  signal: AbortSignal
  overrides?: AgentExecutionOverrides
}

interface AgentExecutionResult {
  finalReply: string
  responseRecord: NormalChatConversationTurnResponseRecord
  runtimeTrace: NormalChatConversationRuntimeTrace
  assistantParts: NormalChatFunctionCallMessagePart[]
  roundCount: number
}

interface ChildAgentSummary {
  childAgentRunId: string
  summaryMarkdown: string
}

type ActiveAgentContext = AgentExecutionInput & { depth: number }

export class NormalChatAgentRuntime implements NormalChatDispatchSubAgentRunner {
  private activeAgentContext: ActiveAgentContext | null = null

  constructor(
    private readonly graphRunner: NormalChatAgentGraphRunner,
    private readonly promptBuilder: NormalChatPromptBuilder,
    private readonly modelAdapter: NormalChatModelAdapter,
    private readonly envelopeParser: NormalChatOutputEnvelopeParser,
    private readonly actionResolutionService: NormalChatActionResolutionService,
    private readonly loadedActionSpecService: NormalChatLoadedActionSpecService,
    private readonly actionExecutor: NormalChatActionExecutorService,
    private readonly roundPersistenceService: NormalChatRoundPersistenceService,
    private readonly messagesRepository: NormalChatMessagesRepository,
    private readonly turnTracesRepository: NormalChatTurnTracesRepository,
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly agentRunsRepository: NormalChatAgentRunsRepository,
    private readonly actionRunsRepository: NormalChatActionRunsRepository,
    private readonly streamPublisher: NormalChatStreamPublisher
  ) {}

  async start(input: NormalChatAgentRuntimeStartInput): Promise<void> {
    const executionResult = await this.runAgentExecution({
      taskId: input.taskId,
      requestId: input.requestId,
      topicId: input.topicId,
      conversation: input.conversation,
      assistant: input.assistant,
      topic: input.topic,
      userInput: input.userInput,
      providerId: input.providerId,
      modelId: input.modelId,
      agentRun: input.rootAgentRun,
      signal: input.signal
    })

    if (input.signal.aborted) {
      return
    }

    const timestamp = nowIso()
    const assistantMessage: NormalChatConversationMessage = {
      id: randomUUID(),
      topicId: input.topicId,
      requestId: input.requestId,
      role: 'assistant',
      parts: [
        ...executionResult.assistantParts,
        {
          kind: 'text',
          text: executionResult.finalReply
        }
      ],
      createdAt: timestamp,
      updatedAt: timestamp
    }

    this.messagesRepository.insert(assistantMessage)
    this.turnTracesRepository.updateResponseAndRuntimeTrace(
      input.requestId,
      executionResult.responseRecord,
      executionResult.runtimeTrace,
      timestamp
    )
    this.tasksRepository.markCompleted(input.taskId, assistantMessage.id, timestamp)
    this.agentRunsRepository.markCompletedById(
      input.rootAgentRun.id,
      executionResult.finalReply,
      executionResult.roundCount,
      timestamp
    )

    this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
      type: 'message-committed',
      requestId: input.requestId,
      topicId: input.topicId,
      message: assistantMessage
    })
    this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
      type: 'finish',
      requestId: input.requestId,
      topicId: input.topicId,
      assistantMessageId: assistantMessage.id
    })
  }

  async runSubAgent(
    input: NormalChatDispatchSubAgentExecutionInput
  ): Promise<NormalChatDispatchSubAgentOutput> {
    const parentContext = this.activeAgentContext
    if (!parentContext) {
      throw new Error('Subagent dispatch requires an active parent agent context.')
    }

    const childAgentRun = this.agentRunsRepository.createChild({
      taskId: parentContext.taskId,
      parentAgentRunId: parentContext.agentRun.id,
      depth: parentContext.depth + 1,
      roleKind: 'researcher',
      templateId: 'sub-agent-v1',
      goal: input.goal,
      maxReactSteps: input.maxReactSteps,
      maxChildDepth: Math.max(
        0,
        parentContext.assistant.maxRecursionDepth - (parentContext.depth + 1)
      ),
      providerId: parentContext.providerId,
      modelId: parentContext.modelId,
      timestamp: nowIso()
    })

    const childExecution = await this.runAgentExecution({
      ...parentContext,
      userInput: input.goal,
      agentRun: childAgentRun,
      overrides: {
        allowedActionKeys: input.enabledActionKeys,
        pubmedMode: input.pubmedMode,
        maxReactSteps: input.maxReactSteps
      }
    })

    this.agentRunsRepository.markCompletedById(
      childAgentRun.id,
      childExecution.finalReply,
      childExecution.roundCount,
      nowIso()
    )

    return {
      childAgentRunId: childAgentRun.id,
      summaryMarkdown: childExecution.finalReply,
      finalAnswer: childExecution.finalReply
    }
  }

  private async runAgentExecution(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const maxReactSteps = input.overrides?.maxReactSteps ?? input.assistant.maxReasoningSteps
    const resolvedActions = this.resolveActions(input.assistant, input.topic, input.overrides)
    const loadedActionKeys = new Set<string>()
    const actionResults: NormalChatActionResultRecord[] = []
    const assistantParts: NormalChatFunctionCallMessagePart[] = []
    const childSummaries: ChildAgentSummary[] = []
    const replyChunks: string[] = []
    const historyMessages: NormalChatConversationMessage[] = []
    let roundCount = 0
    let currentModelCallId: string | null = null
    let promptBundle: NormalChatPromptBundle = {
      sections: {
        context: '',
        actionDescriptions: '',
        loadedActionSpecs: '',
        actionResults: '',
        outputContract: ''
      },
      promptDocument: ''
    }
    let envelope: NormalChatAgentRoundEnvelope | null = null
    let finalReply = ''
    let shouldContinue = true
    let hasActionsToExecute = false
    let reachedReactLimit = false

    const previousActiveContext = this.activeAgentContext
    this.activeAgentContext = { ...input, depth: input.agentRun.depth }

    try {
      this.agentRunsRepository.markRunningById(input.agentRun.id, nowIso())

      await this.graphRunner.run({
        prepareRound: async () => {
          roundCount += 1
          reachedReactLimit = roundCount >= maxReactSteps
          this.ensureNotAborted(input.signal)
          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'status',
            requestId: input.requestId,
            topicId: input.topicId,
            phase: 'thinking',
            message: `Round ${roundCount}: preparing agent prompt.`
          })
        },
        buildPrompt: async () => {
          historyMessages.splice(
            0,
            historyMessages.length,
            ...this.messagesRepository
              .listByTopic(input.topicId)
              .slice(-Math.max(0, input.assistant.contextMemoryRounds * 2))
          )
          const loadedActions = this.loadedActionSpecService.resolveLoadedActions(
            resolvedActions,
            loadedActionKeys
          )
          promptBundle = this.promptBuilder.buildRoundPromptBundle({
            conversationTitle: input.conversation.title,
            systemPrompt:
              input.topic.systemPromptMode === 'override'
                ? (input.topic.systemPromptOverride ?? '')
                : input.assistant.defaultSystemPrompt,
            historyMessages,
            userInput: input.userInput,
            agentGoal: input.agentRun.goal,
            resolvedActions,
            loadedActions,
            actionResults
          })

          currentModelCallId = this.roundPersistenceService.createQueuedModelCall({
            taskId: input.taskId,
            requestId: input.requestId,
            conversationId: input.conversation.id,
            agentRunId: input.agentRun.id,
            parentActionRunId: input.agentRun.parentAgentRunId,
            depth: input.agentRun.depth,
            roundIndex: roundCount,
            callIndexInAgent: roundCount,
            requestPayload: {
              providerId: input.providerId,
              modelId: input.modelId,
              streamingEnabled: input.assistant.streamingEnabled,
              input: input.userInput,
              effectiveSystemPrompt:
                input.topic.systemPromptMode === 'override'
                  ? (input.topic.systemPromptOverride ?? '')
                  : input.assistant.defaultSystemPrompt
            },
            promptBundle,
            historyMessages,
            loadedActions,
            actionResults
          })
        },
        invokeModel: async () => {
          this.ensureNotAborted(input.signal)
          if (!currentModelCallId) {
            throw new Error('Model call snapshot was not created before invoke.')
          }
          this.roundPersistenceService.markModelCallRunning(currentModelCallId)
          const rawEnvelope = await this.modelAdapter.invokeRound({
            requestId: input.requestId,
            topicId: input.topicId,
            taskId: input.taskId,
            assistantName: input.assistant.name,
            question: input.userInput,
            roundIndex: roundCount,
            agentDepth: input.agentRun.depth,
            parentAgentRunId: input.agentRun.parentAgentRunId,
            promptBundle,
            enabledActions: resolvedActions,
            loadedActionKeys: Array.from(loadedActionKeys),
            actionResults
          })
          envelope = this.envelopeParser.parse(rawEnvelope)
          this.roundPersistenceService.appendModelCallStream(currentModelCallId, envelope.replyMd)
        },
        parseEnvelope: async () => {
          if (!envelope) {
            throw new Error('Missing parsed agent envelope.')
          }

          finalReply = envelope.replyMd
          replyChunks.push(envelope.replyMd)
          hasActionsToExecute =
            envelope.wantsAction && envelope.actionCalls.length > 0 && !reachedReactLimit
          shouldContinue = hasActionsToExecute

          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'assistant-progress',
            requestId: input.requestId,
            topicId: input.topicId,
            message: envelope.apiMetaMd || `Round ${roundCount}: parsed scripted envelope.`
          })
          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'assistant-final-chunk',
            requestId: input.requestId,
            topicId: input.topicId,
            delta: `${envelope.replyMd}\n\n`
          })
          if (currentModelCallId) {
            this.roundPersistenceService.completeModelCall(
              currentModelCallId,
              {
                apiMetaMd: envelope.apiMetaMd,
                replyMd: envelope.replyMd,
                wantsAction: envelope.wantsAction,
                actionCalls: envelope.actionCalls
              },
              envelope.replyMd,
              envelope.replyMd
            )
          }
        },
        executeActions: async () => {
          if (!envelope) {
            throw new Error('Missing envelope before action execution.')
          }

          for (const [parallelIndex, call] of envelope.actionCalls.entries()) {
            this.ensureNotAborted(input.signal)
            const resolvedAction = resolvedActions.find((item) => item.actionKey === call.actionKey)
            const actionRun = this.actionRunsRepository.create({
              taskId: input.taskId,
              agentRunId: input.agentRun.id,
              actionKey: call.actionKey,
              actionKind: resolvedAction?.kind ?? 'system',
              mode: resolvedAction?.mode ?? null,
              roundIndex: roundCount,
              batchIndex: 0,
              parallelIndex,
              inputJson: JSON.stringify(call.input),
              timestamp: nowIso()
            })

            try {
              this.actionRunsRepository.markRunning(actionRun.id, nowIso())
              const executed = await this.actionExecutor.execute({
                call,
                resolvedActions,
                roundIndex: roundCount,
                batchIndex: 0,
                parallelIndex,
                depth: input.agentRun.depth
              })
              this.actionRunsRepository.markSuccess(
                actionRun.id,
                JSON.stringify(executed.resultRecord.output),
                nowIso()
              )
              actionResults.push(executed.resultRecord)
              assistantParts.push(executed.functionCallPart)

              for (const loadedActionKey of executed.loadedActionKeys) {
                if (loadedActionKey) {
                  loadedActionKeys.add(loadedActionKey)
                }
              }

              if (call.actionKey === 'system.dispatch_sub_agent') {
                const subResult = executed.resultRecord.output as NormalChatDispatchSubAgentOutput
                childSummaries.push({
                  childAgentRunId: subResult.childAgentRunId,
                  summaryMarkdown: subResult.summaryMarkdown
                })
              }

              this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
                type: 'assistant-part-upsert',
                requestId: input.requestId,
                topicId: input.topicId,
                part: executed.functionCallPart
              })
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              this.actionRunsRepository.markError(actionRun.id, errorMessage, nowIso())
              const errorPart: NormalChatFunctionCallMessagePart = {
                kind: 'functioncall',
                callId: actionRun.id,
                functionCallName: call.actionKey,
                title: call.actionKey,
                status: 'error',
                input: JSON.stringify(call.input, null, 2),
                output: '',
                errorMessage,
                isStreaming: false,
                roundIndex: roundCount,
                batchIndex: 0,
                parallelIndex,
                depth: input.agentRun.depth,
                decisionReason: 'Action execution failed.'
              }
              assistantParts.push(errorPart)
              this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
                type: 'assistant-part-upsert',
                requestId: input.requestId,
                topicId: input.topicId,
                part: errorPart
              })
              finalReply = `执行 action ${call.actionKey} 时遇到错误：${errorMessage}\n\n我会基于当前已收集到的结果先给出总结。`
              shouldContinue = false
              hasActionsToExecute = false
              break
            }
          }
        },
        finalize: async () => {
          if (!finalReply.trim()) {
            finalReply = '本轮执行结束，但没有拿到可见回答；以下是基于当前上下文的兜底总结。'
          }
        },
        forcedFinalize: async () => {
          finalReply = `${finalReply}\n\n已达到当前 agent 的 ReAct 上限，我会基于已经收集到的资料进行总结。`
          shouldContinue = false
        },
        getState: (): NormalChatAgentGraphState => ({
          node: 'decide-next-round',
          shouldContinue,
          hasActionsToExecute,
          reachedReactLimit
        })
      })
    } catch (error) {
      if (currentModelCallId) {
        this.roundPersistenceService.failModelCall(
          currentModelCallId,
          error instanceof Error ? error.message : String(error),
          finalReply
        )
      }
      this.agentRunsRepository.markErrorById(
        input.agentRun.id,
        error instanceof Error ? error.message : String(error),
        roundCount,
        nowIso()
      )
      throw error
    } finally {
      this.activeAgentContext = previousActiveContext
    }

    return {
      finalReply,
      responseRecord: {
        chunks: replyChunks,
        finalText: finalReply,
        aborted: false,
        errorMessage: null,
        completedAt: nowIso()
      },
      runtimeTrace: {
        traceVersion: 1,
        agentTree: {
          agentRunId: input.agentRun.id,
          depth: input.agentRun.depth,
          rounds: roundCount,
          loadedActionKeys: Array.from(loadedActionKeys),
          childAgentRuns: childSummaries
        },
        metrics: {
          providerId: input.providerId,
          providerName: input.providerId,
          modelId: input.modelId,
          modelName: input.modelId,
          firstTokenLatencyMs: null,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          modelCallCount: roundCount,
          streamingEnabled: input.assistant.streamingEnabled
        },
        execution: {
          mode: 'scripted-normal-chat-v1',
          rounds: roundCount,
          promptPreview: promptBundle.promptDocument
        }
      },
      assistantParts,
      roundCount
    }
  }

  private ensureNotAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new Error('Request aborted')
    }
  }

  private resolveActions(
    assistant: NormalChatAssistant,
    topic: NormalChatTopic,
    overrides?: AgentExecutionOverrides
  ): NormalChatResolvedAction[] {
    let actions = this.actionResolutionService.resolveEnabledActions({ assistant, topic })

    if (overrides?.allowedActionKeys) {
      const allowedActionKeys = new Set(overrides.allowedActionKeys)
      actions = actions.filter(
        (action) => action.kind === 'system' || allowedActionKeys.has(action.actionKey)
      )
    }

    if (overrides?.pubmedMode) {
      actions = actions.map((action) =>
        action.actionKey === 'functioncall.pubmed_search'
          ? { ...action, mode: overrides.pubmedMode ?? action.mode }
          : action
      )
    }

    return actions
  }
}
