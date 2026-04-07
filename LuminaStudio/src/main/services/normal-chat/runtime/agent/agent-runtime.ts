/**
 * Agent 运行时核心
 *
 * Normal Chat Agent 的核心执行引擎，负责管理完整的 ReAct 循环：
 * 1. 准备轮次上下文（递增轮次索引、检查中止信号）
 * 2. 构建 Prompt（组装对话历史、动作规格、动作结果等）
 * 3. 调用 LLM（支持流式和非流式）
 * 4. 解析输出（提取 action 块和 thinking 块）
 * 5. 执行动作（按并发安全性分批执行）
 * 6. 决定是否继续（检查 ReAct 上限、修复尝试次数等）
 *
 * 同时支持子 Agent 递归分派（通过 runSubAgent 方法）。
 *
 * 执行流程图：
 * start() → runAgentExecution() → graphRunner.run() {
 *   prepareRound → buildPrompt → invokeModel → parseEnvelope → executeActions → finalize
 *   ↑ 循环直到 shouldContinue = false 或达到 ReAct 上限 ↓
 * } → 持久化结果 → 发布流事件
 */
import { randomUUID } from 'node:crypto'
import type {
  NormalChatConversationMessage,
  NormalChatFunctionCallMessagePart,
  NormalChatTaskExecutionSnapshot,
  NormalChatTaskFinalResponse,
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
  signal: AbortSignal
  overrides?: AgentExecutionOverrides
}

interface AgentExecutionResult {
  finalReply: string
  finalResponse: NormalChatTaskFinalResponse
  assistantParts: Array<NormalChatFunctionCallMessagePart | NormalChatThinkingMessagePart>
  roundCount: number
}

type ActiveAgentContext = AgentExecutionInput & { depth: number }

type StreamingFenceMode = 'hidden' | 'visible'

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
    if (!this.currentLine) {
      return ''
    }

    if (this.currentFenceMode === 'hidden') {
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
    const state = this.roundStateFactory.create({
      executionSnapshot: input.executionSnapshot,
      seedHistoryMessages: input.executionSnapshot.historyMessages,
      resolvedActions
    })

    const assistantParts: Array<NormalChatFunctionCallMessagePart | NormalChatThinkingMessagePart> =
      []
    const replyChunks: string[] = []
    let currentModelCallId: string | null = null
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
          state.reachedReactLimit = state.roundIndex >= maxReactSteps
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

          currentModelCallId = this.roundPersistenceService.createQueuedModelCall({
            taskId: input.taskId,
            requestId: input.requestId,
            conversationId: input.executionSnapshot.conversation.id,
            agentRunId: input.agentRun.id,
            parentActionRunId: input.agentRun.parentAgentRunId,
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
          if (budgeted.snapshot.trimmedSections.length > 0) {
            this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
              type: 'prompt-budget-trimmed',
              requestId: input.requestId,
              topicId: input.topicId,
              roundIndex: state.roundIndex,
              originalCharCount: budgeted.snapshot.originalCharCount,
              trimmedCharCount: budgeted.snapshot.trimmedCharCount,
              trimmedSections: budgeted.snapshot.trimmedSections
            })
          }
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
                    depth: input.agentRun.depth
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

          const artifact = this.roundMemoryService.createArtifactFromAssistant({
            roundIndex: state.roundIndex,
            bodyMd: structuredOutput.body_md,
            actionCalls: structuredOutput.action_calls
          })
          state.assistantArtifacts.push(artifact)
          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'memory-updated',
            requestId: input.requestId,
            topicId: input.topicId,
            roundIndex: state.roundIndex,
            artifactSummary: artifact.bodyMd
          })

          state.hasActionsToExecute =
            structuredOutput.action_calls.length > 0 && !state.reachedReactLimit
          state.shouldContinue = state.hasActionsToExecute || Boolean(repairNotice)

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
              depth: input.agentRun.depth
            })
          }

          this.streamPublisher.publish(input.taskId, input.topicId, input.requestId, {
            type: 'assistant-progress',
            requestId: input.requestId,
            topicId: input.topicId,
            message: structuredOutput.body_md
          })

          if (!state.hasActionsToExecute && !repairNotice) {
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
                delta: finalChunkDelta
              })
            }
          }

          this.roundPersistenceService.completeModelCall(
            currentModelCallId,
            {
              body_md: structuredOutput.body_md,
              action_calls: structuredOutput.action_calls,
              thinking_md: structuredOutput.thinking_md,
              repair_notice: repairNotice
            },
            structuredOutput.body_md,
            rawModelResponseText
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
                artifactSummary: merged.resultSummaryMd || merged.bodyMd
              })
            }

            for (const item of executedItems) {
              if (item.feedback.length > 0) {
                repairNotice = item.feedback.map((feedback) => feedback.message).join('\n')
                state.shouldContinue = true
                if (!item.feedback.every((feedback) => feedback.retryable)) {
                  state.shouldContinue = false
                }
              }
              for (const loadedActionKey of item.loadedActionKeys) {
                if (loadedActionKey) {
                  state.loadedActionKeys.add(loadedActionKey)
                }
              }
            }
          }
        },
        finalize: async () => {
          if (!state.finalReply.trim()) {
            const latestArtifact = state.assistantArtifacts.at(-1)
            state.finalReply =
              latestArtifact?.bodyMd ||
              '本轮执行结束，但没有拿到可见回答；以下是基于当前上下文的兜底总结。'
          }
        },
        forcedFinalize: async () => {
          state.finalReply =
            `${state.finalReply}\n\n已达到当前 agent 的 ReAct 上限，我会基于已经收集到的资料进行总结。`.trim()
          state.shouldContinue = false
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
  ): Promise<
    ReturnType<NormalChatAgentRuntime['executeSingleActionCall']> extends Promise<infer T>
      ? T[]
      : never
  > {
    const results = [] as Array<
      Awaited<ReturnType<NormalChatAgentRuntime['executeSingleActionCall']>>
    >
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
        roundIndex: input.state.roundIndex,
        agentDepth: input.input.agentRun.depth,
        executionSnapshot: input.input.executionSnapshot
      }
    })

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

    executed.functionCallPart.callId = actionRun.id

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
