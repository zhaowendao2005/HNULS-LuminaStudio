import { randomUUID } from 'node:crypto'
import type {
  NormalChatConversationMessage,
  NormalChatFunctionCallMessagePart,
  NormalChatTaskExecutionSnapshot,
  NormalChatTaskFinalResponse
} from '@preload/types'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'
import type {
  NormalChatDispatchSubAgentExecutionInput,
  NormalChatDispatchSubAgentOutput,
  NormalChatDispatchSubAgentRunner
} from '../actions/system/dispatch-sub-agent'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import {
  NormalChatAgentRunsRepository,
  type NormalChatAgentRunRecord
} from '../../repositories/agent-runs.repository'
import { NormalChatMessagesRepository } from '../../repositories/messages.repository'
import { NormalChatTasksRepository } from '../../repositories/tasks.repository'
import { NormalChatActionRunsRepository } from '../../repositories/action-runs.repository'
import { nowIso } from '../../shared/utils'
import { NormalChatActionExecutorService } from '../actions/shared/action-executor.service'
import { NormalChatActionResolutionService } from '../actions/shared/action-resolution.service'
import { NormalChatLoadedActionSpecService } from '../actions/shared/loaded-action-spec.service'
import { NormalChatAssistantOutputParser } from './response/assistant-output-parser'
import type { NormalChatAssistantStructuredOutput } from './response/assistant-output.types'
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
  executionSnapshot: NormalChatTaskExecutionSnapshot
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
  executionSnapshot: NormalChatTaskExecutionSnapshot
  userInput: string
  agentRun: NormalChatAgentRunRecord
  signal: AbortSignal
  overrides?: AgentExecutionOverrides
}

interface AgentExecutionResult {
  finalReply: string
  finalResponse: NormalChatTaskFinalResponse
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
    private readonly assistantOutputParser: NormalChatAssistantOutputParser,
    private readonly actionResolutionService: NormalChatActionResolutionService,
    private readonly loadedActionSpecService: NormalChatLoadedActionSpecService,
    private readonly actionExecutor: NormalChatActionExecutorService,
    private readonly roundPersistenceService: NormalChatRoundPersistenceService,
    private readonly messagesRepository: NormalChatMessagesRepository,
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly agentRunsRepository: NormalChatAgentRunsRepository,
    private readonly actionRunsRepository: NormalChatActionRunsRepository,
    private readonly streamPublisher: NormalChatStreamPublisher
  ) {}

  async start(input: NormalChatAgentRuntimeStartInput): Promise<void> {
    const startTimestamp = nowIso()
    this.tasksRepository.markRunning(input.taskId, 'preparing_context', startTimestamp)

    const executionResult = await this.runAgentExecution({
      taskId: input.taskId,
      requestId: input.requestId,
      topicId: input.topicId,
      executionSnapshot: input.executionSnapshot,
      userInput: input.executionSnapshot.request.input,
      agentRun: input.rootAgentRun,
      signal: input.signal
    })

    if (input.signal.aborted) {
      return
    }

    const timestamp = nowIso()
    this.tasksRepository.markPhase(input.taskId, 'committing_message', timestamp)

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
    const finishSeq = this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
      type: 'finish',
      requestId: input.requestId,
      topicId: input.topicId,
      assistantMessageId: assistantMessage.id
    })
    this.agentRunsRepository.markSucceededById(
      input.rootAgentRun.id,
      executionResult.finalReply,
      executionResult.roundCount,
      timestamp
    )
    this.tasksRepository.markSucceeded(
      input.taskId,
      assistantMessage.id,
      {
        ...executionResult.finalResponse,
        assistantMessageId: assistantMessage.id
      },
      finishSeq,
      timestamp
    )

    this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
      type: 'message-committed',
      requestId: input.requestId,
      topicId: input.topicId,
      message: assistantMessage
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
        parentContext.executionSnapshot.runtime.maxRecursionDepth - (parentContext.depth + 1)
      ),
      providerId: parentContext.executionSnapshot.request.providerId,
      modelId: parentContext.executionSnapshot.request.modelId,
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

    this.agentRunsRepository.markSucceededById(
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
    const maxReactSteps =
      input.overrides?.maxReactSteps ?? input.executionSnapshot.runtime.maxReasoningSteps
    const resolvedActions = this.resolveActions(input.executionSnapshot, input.overrides)
    const loadedActionKeys = new Set<string>()
    const actionResults: NormalChatActionResultRecord[] = []
    const assistantParts: NormalChatFunctionCallMessagePart[] = []
    const childSummaries: ChildAgentSummary[] = []
    const replyChunks: string[] = []
    const historyMessages = input.executionSnapshot.historyMessages
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
    let structuredOutput: NormalChatAssistantStructuredOutput | null = null
    let rawModelResponseText = ''
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
          this.tasksRepository.markPhase(input.taskId, 'preparing_context', nowIso())
          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'status',
            requestId: input.requestId,
            topicId: input.topicId,
            phase: 'thinking',
            message: `Round ${roundCount}: preparing agent prompt.`
          })
        },
        buildPrompt: async () => {
          this.tasksRepository.markPhase(input.taskId, 'building_prompt', nowIso())
          const loadedActions = this.loadedActionSpecService.resolveLoadedActions(
            resolvedActions,
            loadedActionKeys
          )
          promptBundle = this.promptBuilder.buildRoundPromptBundle({
            conversationTitle: input.executionSnapshot.conversation.title,
            systemPrompt: input.executionSnapshot.runtime.systemPrompt,
            historyMessages,
            userInput: input.userInput,
            agentGoal: input.agentRun.goal,
            promptInjections: input.executionSnapshot.promptInjections,
            resolvedActions,
            loadedActions,
            actionResults
          })

          currentModelCallId = this.roundPersistenceService.createQueuedModelCall({
            taskId: input.taskId,
            requestId: input.requestId,
            conversationId: input.executionSnapshot.conversation.id,
            agentRunId: input.agentRun.id,
            parentActionRunId: input.agentRun.parentAgentRunId,
            depth: input.agentRun.depth,
            roundIndex: roundCount,
            callIndexInAgent: roundCount,
            requestPayload: {
              providerId: input.executionSnapshot.request.providerId,
              modelId: input.executionSnapshot.request.modelId,
              streamingEnabled: input.executionSnapshot.runtime.streamingEnabled,
              input: input.userInput,
              effectiveSystemPrompt: input.executionSnapshot.runtime.systemPrompt
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
          this.tasksRepository.markPhase(input.taskId, 'awaiting_model', nowIso())
          this.roundPersistenceService.markModelCallRunning(currentModelCallId)
          rawModelResponseText = await this.modelAdapter.invokeRound({
            requestId: input.requestId,
            topicId: input.topicId,
            taskId: input.taskId,
            executionSnapshot: input.executionSnapshot,
            roundIndex: roundCount,
            agentDepth: input.agentRun.depth,
            parentAgentRunId: input.agentRun.parentAgentRunId,
            promptBundle,
            enabledActions: resolvedActions,
            loadedActionKeys: Array.from(loadedActionKeys),
            actionResults
          })
          structuredOutput = this.assistantOutputParser.parse(rawModelResponseText)
          this.roundPersistenceService.appendModelCallStream(
            currentModelCallId,
            rawModelResponseText
          )
        },
        parseEnvelope: async () => {
          if (!structuredOutput) {
            throw new Error('Missing parsed assistant output.')
          }

          hasActionsToExecute = structuredOutput.action_calls.length > 0 && !reachedReactLimit
          shouldContinue = hasActionsToExecute

          const progressMessage = hasActionsToExecute
            ? structuredOutput.body_md
            : `Round ${roundCount}: parsed assistant output.`

          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'assistant-progress',
            requestId: input.requestId,
            topicId: input.topicId,
            message: progressMessage
          })

          if (!hasActionsToExecute) {
            finalReply = structuredOutput.body_md
            replyChunks.push(structuredOutput.body_md)
            this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
              type: 'assistant-final-chunk',
              requestId: input.requestId,
              topicId: input.topicId,
              delta: `${structuredOutput.body_md}\n\n`
            })
          }

          if (currentModelCallId) {
            this.roundPersistenceService.completeModelCall(
              currentModelCallId,
              {
                body_md: structuredOutput.body_md,
                action_calls: structuredOutput.action_calls
              },
              structuredOutput.body_md,
              rawModelResponseText
            )
          }
        },
        executeActions: async () => {
          if (!structuredOutput) {
            throw new Error('Missing structured output before action execution.')
          }

          this.tasksRepository.markPhase(input.taskId, 'executing_actions', nowIso())

          for (const [parallelIndex, call] of structuredOutput.action_calls.entries()) {
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
              this.actionRunsRepository.markSucceeded(
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
              this.actionRunsRepository.markFailed(actionRun.id, errorMessage, nowIso())
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
      this.agentRunsRepository.markFailedById(
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
      finalResponse: {
        chunks: replyChunks,
        finalText: finalReply,
        aborted: false,
        errorMessage: null,
        completedAt: nowIso(),
        assistantMessageId: null
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
    executionSnapshot: NormalChatTaskExecutionSnapshot,
    overrides?: AgentExecutionOverrides
  ): NormalChatResolvedAction[] {
    let actions = this.actionResolutionService.resolveEnabledActionsFromSnapshot(
      executionSnapshot.actions
    )

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
