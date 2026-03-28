import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  NormalChatConversationMessage,
  NormalChatSendMessageAccepted,
  NormalChatSendMessageRequest
} from '@preload/types'
import { NormalChatAgentRunsRepository } from '../repositories/agent-runs.repository'
import { NormalChatMessagesRepository } from '../repositories/messages.repository'
import { NormalChatTasksRepository } from '../repositories/tasks.repository'
import { NormalChatTurnTracesRepository } from '../repositories/turn-traces.repository'
import { nowIso } from '../shared/utils'
import { NormalChatWorkspaceService } from '../workspace/workspace-service'
import { NormalChatAgentRuntime } from './agent/agent-runtime'
import { NormalChatPromptBuilder } from './prompt/prompt-builder'
import { NormalChatTaskScheduler } from './scheduler/task-scheduler'

// 负责把 workspace/agent/runtime 这几层串在一起，维持数据库和执行流的边界。
export class NormalChatRuntimeService {
  constructor(
    private readonly db: Database.Database,
    private readonly workspaceService: NormalChatWorkspaceService,
    private readonly messagesRepository: NormalChatMessagesRepository,
    private readonly turnTracesRepository: NormalChatTurnTracesRepository,
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly agentRunsRepository: NormalChatAgentRunsRepository,
    private readonly promptBuilder: NormalChatPromptBuilder,
    private readonly taskScheduler: NormalChatTaskScheduler,
    private readonly agentRuntime: NormalChatAgentRuntime
  ) {}

  // 启动时扫描运行中任务，确保重启后不会持续挂起。
  markInterruptedTasksFailed(): void {
    this.taskScheduler.markInterruptedTasksFailed()
  }

  // 主要 entry point：组合 workspace 配置、request record、记录 task/agent，然后交给 agent runtime。
  async sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted> {
    this.workspaceService.ensureSeedData()

    const topic = this.workspaceService.getTopicById(undefined, payload.topicId)
    const assistant = this.workspaceService.getAssistantById(topic.assistantId)
    const requestId = payload.clientRequestId || `request-${randomUUID()}`
    const taskId = randomUUID()
    const userMessageId = randomUUID()
    const rootAgentRunId = randomUUID()
    const timestamp = nowIso()

    const userMessage: NormalChatConversationMessage = {
      id: userMessageId,
      topicId: payload.topicId,
      requestId,
      role: 'user',
      parts: [{ kind: 'text', text: payload.input }],
      createdAt: timestamp,
      updatedAt: timestamp
    }

    const requestRecord = this.promptBuilder.buildRequestRecord({
      assistant,
      topic,
      providerId: payload.providerId,
      modelId: payload.modelId,
      input: payload.input
    })

    // 批量插入 message/trace/task/snapshot/agent run，保持一轮数据的一致性。
    const transaction = this.db.transaction(() => {
      this.messagesRepository.insert(userMessage)
      this.turnTracesRepository.create({
        requestId,
        topicId: payload.topicId,
        assistantId: assistant.id,
        assistantName: assistant.name,
        assistantEmoji: assistant.emoji,
        topicTitle: topic.title,
        requestRecord,
        responseRecord: this.promptBuilder.createInitialResponseRecord(),
        timestamp
      })
      this.tasksRepository.create({
        taskId,
        requestId,
        topicId: payload.topicId,
        assistantId: assistant.id,
        userMessageId,
        rootAgentRunId,
        providerId: payload.providerId,
        modelId: payload.modelId,
        timestamp
      })
      this.tasksRepository.createSnapshot({
        taskId,
        requestId,
        topicId: payload.topicId,
        assistantId: assistant.id,
        userInput: payload.input,
        resolvedConfig: this.promptBuilder.buildResolvedConfig({
          assistant,
          topic,
          providerId: payload.providerId,
          modelId: payload.modelId
        }),
        requestPayload: requestRecord,
        timestamp
      })
      this.agentRunsRepository.createRoot({
        rootAgentRunId,
        taskId,
        goal: payload.input,
        maxReactSteps: assistant.maxReasoningSteps,
        maxChildDepth: assistant.maxRecursionDepth,
        providerId: payload.providerId,
        modelId: payload.modelId,
        timestamp
      })
    })
    transaction()

    // 启动 agent runtime，graph runner 会再调 executor 产生流式事件。
    this.agentRuntime.start({
      taskId,
      requestId,
      topicId: payload.topicId,
      assistant,
      providerId: payload.providerId,
      modelId: payload.modelId
    })

    return {
      requestId,
      message: userMessage
    }
  }

  // 由 scheduler 负责协调中止逻辑并推送 finish 事件。
  abort(requestId: string): void {
    this.taskScheduler.abort(requestId)
  }
}
