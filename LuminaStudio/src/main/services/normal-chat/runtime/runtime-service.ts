/**
 * Normal Chat 运行时服务
 *
 * Normal Chat 子系统的顶层入口服务，负责：
 * 1. 接收用户消息请求（sendMessage）
 * 2. 组装任务执行快照（TaskExecutionSnapshot）
 * 3. 创建数据库记录（用户消息、任务、Agent 运行）
 * 4. 将任务提交到队列执行器
 * 5. 管理任务中止（abort）
 *
 * 运行时服务协调了以下子系统：
 * - WorkspaceService：工作区管理（话题、助手）
 * - ConversationConfigService：对话配置解析
 * - MessagesRepository：消息持久化
 * - TasksRepository：任务持久化
 * - AgentRunsRepository：Agent 运行记录
 * - TaskScheduler：任务调度器
 * - QueueExecutor：队列执行器
 * - AgentRuntime：Agent 执行引擎
 */
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatSendMessageAccepted,
  NormalChatSendMessageRequest,
  NormalChatTaskExecutionActionSnapshot,
  NormalChatTaskExecutionSnapshot,
  NormalChatTopic
} from '@preload/types'
import { NormalChatConversationConfigService } from '../conversation/conversation-config-service'
import { NormalChatAgentRunsRepository } from '../repositories/agent-runs.repository'
import { NormalChatMessagesRepository } from '../repositories/messages.repository'
import { NormalChatTasksRepository } from '../repositories/tasks.repository'
import { nowIso } from '../shared/utils'
import { NormalChatWorkspaceService } from '../workspace/workspace-service'
import { NormalChatAgentRuntime } from './agent/agent-runtime'
import { NormalChatQueueExecutor } from './scheduler/queue-executor'
import { NormalChatTaskScheduler } from './scheduler/task-scheduler'
import { NormalChatStreamPublisher } from './streaming/stream-publisher'

// ── 默认运行时配置常量 ──
const DEFAULT_PROMPT_BUDGET_CHARS = 28_000 // Prompt 字符预算上限
const DEFAULT_ROUND_MEMORY_WINDOW = 3 // 轮次记忆窗口大小
const DEFAULT_MAX_REPAIR_ATTEMPTS = 2 // 每轮最大修复尝试次数
const DEFAULT_MAX_PROVIDER_RETRIES = 2 // LLM 提供商最大重试次数

export class NormalChatRuntimeService {
  constructor(
    private readonly db: Database.Database,
    private readonly workspaceService: NormalChatWorkspaceService,
    private readonly conversationConfigService: NormalChatConversationConfigService,
    private readonly messagesRepository: NormalChatMessagesRepository,
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly agentRunsRepository: NormalChatAgentRunsRepository,
    private readonly taskScheduler: NormalChatTaskScheduler,
    private readonly queueExecutor: NormalChatQueueExecutor,
    private readonly agentRuntime: NormalChatAgentRuntime,
    private readonly streamPublisher: NormalChatStreamPublisher
  ) {}

  markInterruptedTasksFailed(): void {
    this.taskScheduler.markInterruptedTasksFailed()
  }

  async sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted> {
    this.workspaceService.ensureSeedData()

    const topic = this.workspaceService.getTopicById(undefined, payload.topicId)
    const assistant = this.workspaceService.getAssistantById(topic.assistantId)
    const conversation = this.conversationConfigService.resolveOrCreateDefaultConversation(topic)
    const requestId = payload.clientRequestId || `request-${randomUUID()}`
    const taskId = randomUUID()
    const userMessageId = randomUUID()
    const rootAgentRunId = randomUUID()
    const timestamp = nowIso()

    const effectiveSystemPrompt =
      topic.systemPromptMode === 'override'
        ? (topic.systemPromptOverride ?? '')
        : assistant.defaultSystemPrompt
    const effectiveContextMemoryRounds = resolveNumericOverride(
      topic.contextMemoryRoundsMode,
      topic.contextMemoryRoundsOverride,
      assistant.contextMemoryRounds
    )
    const effectiveMaxRecursionDepth = resolveNumericOverride(
      topic.maxRecursionDepthMode,
      topic.maxRecursionDepthOverride,
      assistant.maxRecursionDepth
    )
    const effectiveMaxReasoningSteps = resolveNumericOverride(
      topic.maxReasoningStepsMode,
      topic.maxReasoningStepsOverride,
      assistant.maxReasoningSteps
    )
    const effectiveStreamingEnabled =
      topic.streamingMode === 'override'
        ? (topic.streamingEnabledOverride ?? assistant.streamingEnabled)
        : assistant.streamingEnabled

    const initialHistoryMessages = this.messagesRepository
      .listByTopic(payload.topicId)
      .slice(-Math.max(0, effectiveContextMemoryRounds * 2))

    const executionSnapshot: NormalChatTaskExecutionSnapshot = {
      assistant: {
        id: assistant.id,
        name: assistant.name,
        emoji: assistant.emoji
      },
      topic: {
        id: topic.id,
        title: topic.title
      },
      conversation: {
        id: conversation.id,
        title: conversation.title,
        agentTemplateId: conversation.agentTemplateId
      },
      request: {
        input: payload.input,
        providerId: payload.providerId,
        modelId: payload.modelId
      },
      runtime: {
        systemPrompt: effectiveSystemPrompt,
        streamingEnabled: effectiveStreamingEnabled,
        contextMemoryRounds: effectiveContextMemoryRounds,
        maxRecursionDepth: effectiveMaxRecursionDepth,
        maxReasoningSteps: effectiveMaxReasoningSteps,
        persistencePreset: assistant.persistencePreset,
        promptBudgetChars: DEFAULT_PROMPT_BUDGET_CHARS,
        roundMemoryWindow: DEFAULT_ROUND_MEMORY_WINDOW,
        maxRepairAttempts: DEFAULT_MAX_REPAIR_ATTEMPTS,
        maxProviderRetries: DEFAULT_MAX_PROVIDER_RETRIES
      },
      historyMessages: initialHistoryMessages,
      promptInjections: conversation.programPromptInjections,
      actions: resolveActionSnapshots(assistant, topic),
      createdAt: timestamp
    }

    const persistedExecutionSnapshot = createPersistedExecutionSnapshot(
      executionSnapshot,
      assistant.persistencePreset
    )

    const userMessage: NormalChatConversationMessage = {
      id: userMessageId,
      topicId: payload.topicId,
      requestId,
      role: 'user',
      parts: [{ kind: 'text', text: payload.input }],
      createdAt: timestamp,
      updatedAt: timestamp
    }

    let rootAgentRun = null as ReturnType<NormalChatAgentRunsRepository['createRoot']> | null

    const transaction = this.db.transaction(() => {
      this.messagesRepository.insert(userMessage)
      this.tasksRepository.create({
        taskId,
        requestId,
        conversationId: conversation.id,
        topicId: payload.topicId,
        assistantId: assistant.id,
        userMessageId,
        rootAgentRunId,
        modelProviderId: payload.providerId,
        modelId: payload.modelId,
        executionSnapshot: persistedExecutionSnapshot,
        timestamp
      })
      rootAgentRun = this.agentRunsRepository.createRoot({
        rootAgentRunId,
        taskId,
        goal: payload.input,
        maxReactSteps: effectiveMaxReasoningSteps,
        maxChildDepth: effectiveMaxRecursionDepth,
        providerId: payload.providerId,
        modelId: payload.modelId,
        timestamp
      })
    })
    transaction()

    this.streamPublisher.setRuntimeEventPersistence(
      requestId,
      assistant.persistencePreset === 'full'
    )

    const controller = new AbortController()
    this.taskScheduler.registerPendingTask(requestId, taskId, payload.topicId, controller)
    this.queueExecutor.enqueue({
      requestId,
      controller,
      execute: async () => {
        try {
          await this.agentRuntime.start({
            taskId,
            requestId,
            topicId: payload.topicId,
            executionSnapshot,
            rootAgentRun: rootAgentRun as ReturnType<NormalChatAgentRunsRepository['createRoot']>,
            signal: controller.signal
          })
        } catch (error) {
          if (!controller.signal.aborted) {
            this.taskScheduler.fail(
              requestId,
              error instanceof Error ? error.message : String(error)
            )
          }
          throw error
        } finally {
          this.taskScheduler.clearPendingTask(requestId)
        }
      }
    })

    return {
      requestId,
      message: userMessage
    }
  }

  abort(requestId: string): void {
    this.taskScheduler.abort(requestId)
  }
}

function createPersistedExecutionSnapshot(
  executionSnapshot: NormalChatTaskExecutionSnapshot,
  persistencePreset: NormalChatAssistant['persistencePreset']
): NormalChatTaskExecutionSnapshot {
  if (persistencePreset === 'full') {
    return executionSnapshot
  }

  return {
    ...executionSnapshot,
    request: {
      ...executionSnapshot.request,
      input: ''
    },
    runtime: {
      ...executionSnapshot.runtime,
      systemPrompt: ''
    },
    historyMessages: [],
    promptInjections: [],
    actions: []
  }
}

function resolveNumericOverride(
  mode: 'inherit' | 'override',
  override: number | null,
  fallback: number
): number {
  return mode === 'override' ? (override ?? fallback) : fallback
}

function resolveActionSnapshots(
  assistant: {
    functionCallPubMedEnabled: boolean
    functionCallPubMedMode: 'fast' | 'slow'
  },
  topic: Pick<
    NormalChatTopic,
    | 'functionCallPubMedMode'
    | 'functionCallPubMedEnabledOverride'
    | 'functionCallPubMedExecutionMode'
    | 'functionCallPubMedExecutionModeOverride'
  >
): NormalChatTaskExecutionActionSnapshot[] {
  const actions: NormalChatTaskExecutionActionSnapshot[] = [
    { actionKey: 'system.get_action_spec', kind: 'system', mode: 'fast' },
    { actionKey: 'system.dispatch_sub_agent', kind: 'system', mode: 'fast' }
  ]

  const pubmedEnabled =
    topic.functionCallPubMedMode === 'override'
      ? (topic.functionCallPubMedEnabledOverride ?? assistant.functionCallPubMedEnabled)
      : assistant.functionCallPubMedEnabled

  if (pubmedEnabled) {
    const pubmedMode =
      topic.functionCallPubMedExecutionMode === 'override'
        ? (topic.functionCallPubMedExecutionModeOverride ?? assistant.functionCallPubMedMode)
        : assistant.functionCallPubMedMode

    actions.push({
      actionKey: 'functioncall.pubmed_search',
      kind: 'functioncall',
      mode: pubmedMode
    })
  }

  return actions
}
