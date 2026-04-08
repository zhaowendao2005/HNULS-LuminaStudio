import { randomUUID } from 'node:crypto'
import type {
  NormalChatConversationMessage,
  NormalChatFunctionCallMessagePart,
  NormalChatTaskExecutionSnapshot,
  NormalChatTaskFinalResponse,
  NormalChatTextMessagePart,
  NormalChatThinkingMessagePart
} from '@preload/types'
import type {
  NormalChatDispatchSubAgentExecutionInput,
  NormalChatDispatchSubAgentOutput,
  NormalChatDispatchSubAgentRunner
} from '../actions/system/dispatch-sub-agent'
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
import type { NormalChatPromptBundleV2 } from '../prompt/prompt-bundle.types'
import type { NormalChatModelAdapter } from '../llm/model-adapter.interface'
import { NormalChatPromptBuilder } from '../prompt/prompt-builder'
import { NormalChatStreamPublisher } from '../streaming/stream-publisher'
import { NormalChatRoundPersistenceService } from './round-persistence.service'
import { NormalChatRoundStateFactory } from './state/round-state.factory'
import { NormalChatAssistantRoundMemoryService } from './memory/assistant-round-memory.service'
import type { NormalChatRoundState } from './state/round-state.types'
import type { NormalChatAssistantTurnKind } from './memory/assistant-round-memory.types'
import { NormalChatPromptBudgetService } from '../prompt/prompt-budget.service'
import { NormalChatRecoveryPolicyService } from './recovery/recovery-policy.service'
import { NormalChatActionBatchPlanner } from '../actions/shared/action-batch-planner'

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
  parentActionRunId: string | null
  signal: AbortSignal
  overrides?: AgentExecutionOverrides
}

interface AgentExecutionResult {
  finalReply: string
  finalResponse: NormalChatTaskFinalResponse
  assistantParts: Array<
    NormalChatFunctionCallMessagePart | NormalChatThinkingMessagePart | NormalChatTextMessagePart
  >
  roundCount: number
}

type ActiveAgentContext = AgentExecutionInput & { depth: number }
type StreamingFenceMode = 'hidden' | 'visible'

// streaming 时正文里仍可能夹带 normal_chat_action / thinking 围栏；
// 这里把“用户可见正文”从原始 token 流里剥出来，保证界面预览不会提前暴露协议块。

class NormalChatVisibleBodyStreamExtractor {
  private currentFenceMode: StreamingFenceMode | null = null
  private currentLine = ''
  private currentLinePreviewLength = 0

  feed(delta: string): string {
    let visibleDelta = ''
    for (const char of delta) {
      this.currentLine += char
      if (char === '\n') {
        visibleDelta += this.flushCompletedLine()
      }
    }
    visibleDelta += this.previewCurrentLine()
    return visibleDelta
  }

  private flushCompletedLine(): string {
    const line = this.currentLine
    this.currentLine = ''
    this.currentLinePreviewLength = 0

    const trimmed = line.trimStart()
    const isFenceLine = trimmed.startsWith('```')
    if (!isFenceLine) {
      return this.currentFenceMode === 'hidden' ? '' : line
    }
    if (this.currentFenceMode === 'hidden') {
      this.currentFenceMode = null
      return ''
    }
    if (this.currentFenceMode === 'visible') {
      this.currentFenceMode = null
      return line
    }
    if (
      trimmed.startsWith('```normal_chat_action') ||
      trimmed.startsWith('```normal_chat_thinking')
    ) {
      this.currentFenceMode = 'hidden'
      return ''
    }
    this.currentFenceMode = 'visible'
    return line
  }

  private previewCurrentLine(): string {
    if (!this.currentLine || this.currentFenceMode === 'hidden') {
      return ''
    }
    const trimmed = this.currentLine.trimStart()
    if (
      trimmed.startsWith('```normal_chat_action') ||
      trimmed.startsWith('```normal_chat_thinking') ||
      /^`{1,3}$/.test(trimmed)
    ) {
      return ''
    }
    if (this.currentFenceMode === null && trimmed.startsWith('```')) {
      return ''
    }
    const nextPreview = this.currentLine.slice(this.currentLinePreviewLength)
    this.currentLinePreviewLength = this.currentLine.length
    return nextPreview
  }
}

export class NormalChatAgentRuntime implements NormalChatDispatchSubAgentRunner {
  private activeAgentContext: ActiveAgentContext | null = null
  private readonly roundStateFactory = new NormalChatRoundStateFactory()
  private readonly roundMemoryService = new NormalChatAssistantRoundMemoryService()
  private readonly promptBudgetService = new NormalChatPromptBudgetService()
  private readonly recoveryPolicy = new NormalChatRecoveryPolicyService()
  private readonly actionBatchPlanner = new NormalChatActionBatchPlanner()

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
      parentActionRunId: null,
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
      parts: executionResult.assistantParts,
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

    this.streamPublisher.publish(
      parentContext.taskId,
      parentContext.topicId,
      parentContext.requestId,
      {
        type: 'subagent-dispatched',
        requestId: parentContext.requestId,
        topicId: parentContext.topicId,
        actionRunId: input.parentActionRunId,
        childAgentRunId: childAgentRun.id,
        goal: input.goal,
        roundIndex: 0,
        batchIndex: 0,
        parallelIndex: 0,
        depth: childAgentRun.depth
      }
    )

    const childExecution = await this.runAgentExecution({
      ...parentContext,
      userInput: input.goal,
      agentRun: childAgentRun,
      parentActionRunId: input.parentActionRunId,
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
    const maxActionRounds =
      input.overrides?.maxReactSteps ?? input.executionSnapshot.runtime.maxReasoningSteps
    const resolvedActions = this.resolveActions(input.executionSnapshot, input.overrides)
    const state = this.roundStateFactory.create({
      executionSnapshot: input.executionSnapshot,
      seedHistoryMessages: input.executionSnapshot.historyMessages,
      resolvedActions
    })

    const assistantParts: Array<
      NormalChatFunctionCallMessagePart | NormalChatThinkingMessagePart | NormalChatTextMessagePart
    > = []
    const replyChunks: string[] = []
    let currentModelCallId: string | null = null
    let currentTurnKind: NormalChatAssistantTurnKind = 'answer'
    let promptBundle: NormalChatPromptBundleV2 | null = null
    let structuredOutput: NormalChatAssistantStructuredOutput | null = null
    let rawModelResponseText = ''
    let streamedBodyText = ''
    let repairNotice: string | null = null

    const previousActiveContext = this.activeAgentContext
    this.activeAgentContext = { ...input, depth: input.agentRun.depth }

    try {
      this.agentRunsRepository.markRunningById(input.agentRun.id, nowIso())

      await this.graphRunner.run({
        prepareRound: async () => {
          state.roundIndex += 1
          // react 限制只限制“还能不能继续新开 action 轮”，不应该吞掉 action 后必须执行的 synthesis 轮。
          state.reachedReactLimit =
            state.actionRoundsUsed >= maxActionRounds && !state.postActionSynthesisPending
          this.ensureNotAborted(input.signal)
          this.tasksRepository.markPhase(input.taskId, 'preparing_context', nowIso())
          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'status',
            requestId: input.requestId,
            topicId: input.topicId,
            phase: 'thinking',
            message: `Round ${state.roundIndex}: preparing agent prompt.`
          })
        },
        buildPrompt: async () => {
          this.tasksRepository.markPhase(input.taskId, 'building_prompt', nowIso())
          const loadedActions = this.loadedActionSpecService.resolveLoadedActions(
            resolvedActions,
            state.loadedActionKeys
          )
          const builtPromptBundle = this.promptBuilder.buildRoundPromptBundle({
            conversationTitle: input.executionSnapshot.conversation.title,
            systemPrompt: input.executionSnapshot.runtime.systemPrompt,
            historyMessages: state.seedHistoryMessages,
            userInput: input.userInput,
            agentGoal: input.agentRun.goal,
            promptInjections: input.executionSnapshot.promptInjections,
            resolvedActions,
            loadedActions,
            actionResults: state.actionResults,
            actionFeedback: state.actionFeedback,
            assistantArtifacts: state.assistantArtifacts,
            roundMemoryWindow: state.runtimeBudget.roundMemoryWindow,
            postActionSynthesisPending: state.postActionSynthesisPending,
            repairNotice,
            thinkingDigest: null
          })
          const budgeted = this.promptBudgetService.fit(builtPromptBundle, {
            maxChars: state.runtimeBudget.promptBudgetChars,
            trimOrder: [
              'loadedActionSpecs',
              'priorRoundMemory',
              'actionResults',
              'actionFeedback',
              'context'
            ]
          })
          promptBundle = budgeted.bundle
          // 进入模型前先根据 runtime 状态给本轮一个预期 turnKind；真正结果会在 parse 后按输出再校正。
          currentTurnKind = state.postActionSynthesisPending ? 'post_action_synthesis' : 'answer'

          currentModelCallId = this.roundPersistenceService.createQueuedModelCall({
            taskId: input.taskId,
            requestId: input.requestId,
            conversationId: input.executionSnapshot.conversation.id,
            agentRunId: input.agentRun.id,
            parentActionRunId: input.parentActionRunId,
            turnKind: currentTurnKind,
            producedActionCount: 0,
            consumedActionRunIds: state.postActionSynthesisPending
              ? state.lastExecutedActionRunIds
              : [],
            synthesisRequired: state.postActionSynthesisPending,
            depth: input.agentRun.depth,
            roundIndex: state.roundIndex,
            callIndexInAgent: state.roundIndex,
            requestPayload: {
              providerId: input.executionSnapshot.request.providerId,
              modelId: input.executionSnapshot.request.modelId,
              streamingEnabled: input.executionSnapshot.runtime.streamingEnabled,
              input: input.userInput,
              effectiveSystemPrompt: input.executionSnapshot.runtime.systemPrompt
            },
            promptBundle,
            trimSnapshot: budgeted.snapshot,
            historyMessages: state.seedHistoryMessages,
            loadedActions,
            actionResults: state.actionResults,
            persist: input.executionSnapshot.runtime.persistencePreset === 'full'
          })

          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'prompt-built',
            requestId: input.requestId,
            topicId: input.topicId,
            modelCallId: currentModelCallId,
            roundIndex: state.roundIndex,
            promptCharCount: promptBundle.promptDocument.length
          })
        },
        invokeModel: async () => {
          this.ensureNotAborted(input.signal)
          if (!currentModelCallId || !promptBundle) {
            throw new Error('Model call snapshot was not created before invoke.')
          }
          this.tasksRepository.markPhase(input.taskId, 'awaiting_model', nowIso())
          this.roundPersistenceService.markModelCallRunning(currentModelCallId)
          rawModelResponseText = ''
          streamedBodyText = ''
          const visibleBodyExtractor = new NormalChatVisibleBodyStreamExtractor()

          if (
            input.executionSnapshot.runtime.streamingEnabled &&
            typeof this.modelAdapter.streamRound === 'function'
          ) {
            for await (const event of this.modelAdapter.streamRound({
              requestId: input.requestId,
              topicId: input.topicId,
              taskId: input.taskId,
              executionSnapshot: input.executionSnapshot,
              roundIndex: state.roundIndex,
              agentDepth: input.agentRun.depth,
              parentAgentRunId: input.agentRun.parentAgentRunId,
              promptBundle,
              enabledActions: resolvedActions,
              loadedActionKeys: Array.from(state.loadedActionKeys),
              actionResults: state.actionResults
            })) {
              if (event.type === 'text-delta') {
                rawModelResponseText += event.delta
                this.roundPersistenceService.appendModelCallStream(
                  currentModelCallId,
                  rawModelResponseText
                )
                this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
                  type: 'assistant-text-delta',
                  requestId: input.requestId,
                  topicId: input.topicId,
                  modelCallId: currentModelCallId,
                  delta: event.delta,
                  roundIndex: state.roundIndex,
                  depth: input.agentRun.depth
                })

                const visibleBodyDelta = visibleBodyExtractor.feed(event.delta)
                if (visibleBodyDelta) {
                  streamedBodyText += visibleBodyDelta
                  this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
                    type: 'assistant-body-delta',
                    requestId: input.requestId,
                    topicId: input.topicId,
                    modelCallId: currentModelCallId,
                    delta: visibleBodyDelta,
                    roundIndex: state.roundIndex,
                    depth: input.agentRun.depth,
                    turnKind: currentTurnKind
                  })
                }
              }
            }
          } else {
            rawModelResponseText = await this.modelAdapter.invokeRound({
              requestId: input.requestId,
              topicId: input.topicId,
              taskId: input.taskId,
              executionSnapshot: input.executionSnapshot,
              roundIndex: state.roundIndex,
              agentDepth: input.agentRun.depth,
              parentAgentRunId: input.agentRun.parentAgentRunId,
              promptBundle,
              enabledActions: resolvedActions,
              loadedActionKeys: Array.from(state.loadedActionKeys),
              actionResults: state.actionResults
            })
            this.roundPersistenceService.appendModelCallStream(
              currentModelCallId,
              rawModelResponseText
            )
          }

          try {
            structuredOutput = this.assistantOutputParser.parse(rawModelResponseText)
            repairNotice = null
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            repairNotice = message
            structuredOutput = {
              body_md: '上一轮输出结构没有通过运行时校验，我将修复输出结构后继续。',
              action_calls: [],
              thinking_md: null
            }
            const nextState = this.recoveryPolicy.registerAttempt(state, {
              kind: 'output_contract_error',
              message
            })
            Object.assign(state, nextState)
          }
        },
        parseEnvelope: async () => {
          if (!structuredOutput || !currentModelCallId) {
            throw new Error('Missing parsed assistant output.')
          }

          if (structuredOutput.thinking_md) {
            const thinkingPart: NormalChatThinkingMessagePart = {
              kind: 'thinking',
              source: 'assistant-tagged',
              title: `Round ${state.roundIndex} Thinking`,
              content: structuredOutput.thinking_md,
              isStreaming: false,
              roundIndex: state.roundIndex,
              depth: input.agentRun.depth
            }
            assistantParts.push(thinkingPart)
            this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
              type: 'assistant-part-upsert',
              requestId: input.requestId,
              topicId: input.topicId,
              part: thinkingPart
            })
          }

          const parsedActionCalls = structuredOutput.action_calls.length
          // 这里才是 turnKind 的最终判定点：
          // 有 action call 就是 action_plan；否则如果上一轮 action 结果尚未消费完，就归为 post_action_synthesis；
          // 再否则才是普通 answer。
          currentTurnKind =
            parsedActionCalls > 0
              ? 'action_plan'
              : state.postActionSynthesisPending
                ? 'post_action_synthesis'
                : 'answer'
          state.lastTurnKind = currentTurnKind

          if (structuredOutput.body_md.trim()) {
            assistantParts.push({
              kind: 'text',
              text: structuredOutput.body_md,
              turnKind: currentTurnKind,
              roundIndex: state.roundIndex,
              depth: input.agentRun.depth,
              modelCallId: currentModelCallId
            })
          }

          const artifact = this.roundMemoryService.createArtifactFromAssistant({
            roundIndex: state.roundIndex,
            turnKind: currentTurnKind,
            bodyMd: structuredOutput.body_md,
            actionCalls: structuredOutput.action_calls
          })
          state.assistantArtifacts.push(artifact)
          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'memory-updated',
            requestId: input.requestId,
            topicId: input.topicId,
            roundIndex: state.roundIndex,
            artifactSummary: artifact.answerBodyMd || artifact.planBodyMd || artifact.bodyMd
          })

          const actionBudgetExhausted = state.actionRoundsUsed >= maxActionRounds
          state.reachedReactLimit = actionBudgetExhausted && !state.postActionSynthesisPending
          state.hasActionsToExecute = parsedActionCalls > 0 && !actionBudgetExhausted
          // 是否继续整条轨迹由三类条件驱动：
          // 1. 当前轮输出了 action_plan；2. 需要修复结构；3. 上一批 action 已完成但 synthesis 尚未产出。
          state.shouldContinue =
            currentTurnKind === 'action_plan' ||
            Boolean(repairNotice) ||
            state.postActionSynthesisPending

          if (
            structuredOutput.body_md.startsWith(streamedBodyText) &&
            structuredOutput.body_md.length > streamedBodyText.length
          ) {
            const remainingBodyDelta = structuredOutput.body_md.slice(streamedBodyText.length)
            streamedBodyText += remainingBodyDelta
            this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
              type: 'assistant-body-delta',
              requestId: input.requestId,
              topicId: input.topicId,
              modelCallId: currentModelCallId,
              delta: remainingBodyDelta,
              roundIndex: state.roundIndex,
              depth: input.agentRun.depth,
              turnKind: currentTurnKind
            })
          }

          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'assistant-progress',
            requestId: input.requestId,
            topicId: input.topicId,
            message: structuredOutput.body_md
          })

          if (currentTurnKind !== 'action_plan' && !repairNotice) {
            state.finalReply = structuredOutput.body_md
            replyChunks.push(structuredOutput.body_md)
            const finalChunkDelta = structuredOutput.body_md.startsWith(streamedBodyText)
              ? structuredOutput.body_md.slice(streamedBodyText.length)
              : structuredOutput.body_md
            if (finalChunkDelta) {
              this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
                type: 'assistant-final-chunk',
                requestId: input.requestId,
                topicId: input.topicId,
                modelCallId: currentModelCallId,
                delta: finalChunkDelta,
                turnKind: currentTurnKind,
                roundIndex: state.roundIndex,
                depth: input.agentRun.depth
              })
            }
          }

          this.roundPersistenceService.completeModelCall(
            currentModelCallId,
            {
              body_md: structuredOutput.body_md,
              action_calls: structuredOutput.action_calls,
              thinking_md: structuredOutput.thinking_md,
              repair_notice: repairNotice,
              turn_kind: currentTurnKind
            },
            currentTurnKind === 'action_plan' ? '' : structuredOutput.body_md,
            rawModelResponseText,
            {
              turnKind: currentTurnKind,
              producedActionCount: parsedActionCalls,
              consumedActionRunIds: state.postActionSynthesisPending
                ? state.lastExecutedActionRunIds
                : [],
              synthesisRequired: currentTurnKind === 'action_plan'
            }
          )
        },
        executeActions: async () => {
          if (!structuredOutput) {
            throw new Error('Missing structured output before action execution.')
          }

          this.tasksRepository.markPhase(input.taskId, 'executing_actions', nowIso())
          const batches = this.actionBatchPlanner.partitionActionCalls(
            structuredOutput.action_calls,
            resolvedActions
          )

          const executedActionRunIds = new Set<string>()
          for (const [batchIndex, batch] of batches.entries()) {
            const executedItems = batch.parallel
              ? await Promise.all(
                  batch.calls.map((call, parallelIndex) =>
                    this.executeSingleActionCall({
                      call,
                      batchIndex,
                      parallelIndex,
                      input,
                      state
                    })
                  )
                )
              : await this.executeSerialBatch(batch.calls, batchIndex, input, state)

            assistantParts.push(...executedItems.map((item) => item.functionCallPart))
            const batchResult = this.actionExecutor.createBatchResult(executedItems)
            batchResult.executedActionRunIds.forEach((id) => executedActionRunIds.add(id))
            state.actionResults.push(...batchResult.results)
            state.actionFeedback.push(...batchResult.feedback)

            const latestArtifact = state.assistantArtifacts.at(-1)
            if (latestArtifact) {
              const merged = this.roundMemoryService.mergeExecutionResultsIntoArtifact(
                latestArtifact,
                batchResult
              )
              state.assistantArtifacts[state.assistantArtifacts.length - 1] = merged
              this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
                type: 'memory-updated',
                requestId: input.requestId,
                topicId: input.topicId,
                roundIndex: state.roundIndex,
                artifactSummary:
                  merged.resultSummaryMd ||
                  merged.answerBodyMd ||
                  merged.planBodyMd ||
                  merged.bodyMd
              })
            }

            for (const item of executedItems) {
              if (item.feedback.length > 0) {
                repairNotice = item.feedback.map((feedback) => feedback.message).join('\n')
              }
              for (const loadedActionKey of item.loadedActionKeys) {
                if (loadedActionKey) {
                  state.loadedActionKeys.add(loadedActionKey)
                }
              }
            }
          }

          if (batches.length > 0) {
            state.actionRoundsUsed += 1
            // 一旦 action 真正执行过，就强制把下一轮转成结果消费轮，直到生成 synthesis/final answer。
            state.postActionSynthesisPending = true
            state.lastExecutedActionRunIds = Array.from(executedActionRunIds)
            state.shouldContinue = true
            state.hasActionsToExecute = false
          }
        },
        finalize: async () => {
          if (!state.finalReply.trim()) {
            state.finalReply = this.roundMemoryService.buildDeterministicFinalSummary({
              actionResults: state.actionResults,
              actionFeedback: state.actionFeedback,
              assistantArtifacts: state.assistantArtifacts
            })
          }
          const latestTextPart = [...assistantParts]
            .reverse()
            .find((part): part is NormalChatTextMessagePart => part.kind === 'text')
          if (state.finalReply.trim() && latestTextPart?.text !== state.finalReply) {
            assistantParts.push({
              kind: 'text',
              text: state.finalReply,
              turnKind: 'post_action_synthesis',
              roundIndex: state.roundIndex,
              depth: input.agentRun.depth,
              modelCallId: currentModelCallId
            })
          }
          // 只要已经拿到最终可见文本，就视为结果消费完成，清空 pending 标记。
          state.postActionSynthesisPending = false
        },
        forcedFinalize: async () => {
          state.finalReply = this.roundMemoryService.buildDeterministicFinalSummary({
            actionResults: state.actionResults,
            actionFeedback: state.actionFeedback,
            assistantArtifacts: state.assistantArtifacts
          })
          assistantParts.push({
            kind: 'text',
            text: state.finalReply,
            turnKind: 'post_action_synthesis',
            roundIndex: state.roundIndex,
            depth: input.agentRun.depth,
            modelCallId: currentModelCallId
          })
          state.shouldContinue = false
          state.postActionSynthesisPending = false
        },
        getState: (): NormalChatAgentGraphState => ({
          node: 'decide-next-round',
          shouldContinue: this.recoveryPolicy.shouldContinue(state),
          hasActionsToExecute: state.hasActionsToExecute || Boolean(repairNotice),
          reachedReactLimit: state.reachedReactLimit
        })
      })
    } catch (error) {
      if (currentModelCallId) {
        this.roundPersistenceService.failModelCall(
          currentModelCallId,
          error instanceof Error ? error.message : String(error),
          rawModelResponseText
        )
      }
      this.agentRunsRepository.markFailedById(
        input.agentRun.id,
        error instanceof Error ? error.message : String(error),
        state.roundIndex,
        nowIso()
      )
      throw error
    } finally {
      this.activeAgentContext = previousActiveContext
    }

    return {
      finalReply: state.finalReply,
      finalResponse: {
        chunks: replyChunks,
        finalText: state.finalReply,
        aborted: false,
        errorMessage: null,
        completedAt: nowIso(),
        assistantMessageId: null
      },
      assistantParts,
      roundCount: state.roundIndex
    }
  }

  private async executeSerialBatch(
    calls: NormalChatAssistantStructuredOutput['action_calls'],
    batchIndex: number,
    input: AgentExecutionInput,
    state: NormalChatRoundState
  ): Promise<Awaited<ReturnType<NormalChatAgentRuntime['executeSingleActionCall']>>[]> {
    const results: Array<Awaited<ReturnType<NormalChatAgentRuntime['executeSingleActionCall']>>> =
      []
    for (const [parallelIndex, call] of calls.entries()) {
      results.push(
        await this.executeSingleActionCall({
          call,
          batchIndex,
          parallelIndex,
          input,
          state
        })
      )
    }
    return results
  }

  private async executeSingleActionCall(input: {
    call: NormalChatAssistantStructuredOutput['action_calls'][number]
    batchIndex: number
    parallelIndex: number
    input: AgentExecutionInput
    state: NormalChatRoundState
  }) {
    const resolvedAction = input.state.resolvedActions.find(
      (item) => item.actionKey === input.call.actionKey
    )
    const actionRun = this.actionRunsRepository.create({
      taskId: input.input.taskId,
      agentRunId: input.input.agentRun.id,
      actionKey: input.call.actionKey,
      actionKind: resolvedAction?.kind ?? 'system',
      mode: resolvedAction?.mode ?? null,
      roundIndex: input.state.roundIndex,
      batchIndex: input.batchIndex,
      parallelIndex: input.parallelIndex,
      inputJson: JSON.stringify(input.call.input),
      timestamp: nowIso()
    })

    this.actionRunsRepository.markRunning(actionRun.id, nowIso())
    const executed = await this.actionExecutor.execute({
      call: input.call,
      resolvedActions: input.state.resolvedActions,
      roundIndex: input.state.roundIndex,
      batchIndex: input.batchIndex,
      parallelIndex: input.parallelIndex,
      depth: input.input.agentRun.depth,
      context: {
        taskId: input.input.taskId,
        requestId: input.input.requestId,
        actionRunId: actionRun.id,
        roundIndex: input.state.roundIndex,
        agentDepth: input.input.agentRun.depth,
        executionSnapshot: input.input.executionSnapshot
      }
    })

    if (executed.resultRecord.status === 'success') {
      this.actionRunsRepository.markSucceeded(
        actionRun.id,
        JSON.stringify(executed.resultRecord.output),
        nowIso()
      )
    } else {
      this.actionRunsRepository.markFailed(
        actionRun.id,
        executed.resultRecord.errorMessage ?? 'Unknown action error',
        nowIso()
      )
    }

    executed.actionRunId = actionRun.id
    executed.functionCallPart.callId = actionRun.id

    this.streamPublisher.publish(input.input.taskId, input.input.topicId, input.input.requestId, {
      type: 'action-validated',
      requestId: input.input.requestId,
      topicId: input.input.topicId,
      actionKey: input.call.actionKey,
      roundIndex: input.state.roundIndex,
      status: executed.resultRecord.status,
      schemaDebugSnapshot: executed.schemaDebugSnapshot,
      message: executed.resultRecord.errorMessage
    })
    this.streamPublisher.publish(input.input.taskId, input.input.topicId, input.input.requestId, {
      type: 'assistant-part-upsert',
      requestId: input.input.requestId,
      topicId: input.input.topicId,
      part: executed.functionCallPart
    })

    return executed
  }

  private ensureNotAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new Error('Request aborted')
    }
  }

  private resolveActions(
    executionSnapshot: NormalChatTaskExecutionSnapshot,
    overrides?: AgentExecutionOverrides
  ) {
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
