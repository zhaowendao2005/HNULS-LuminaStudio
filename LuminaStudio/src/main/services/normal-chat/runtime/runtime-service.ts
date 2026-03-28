import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type {
  NormalChatConversationMessage,
  NormalChatSendMessageAccepted,
  NormalChatSendMessageRequest
} from '@preload/types'
import { NormalChatConversationConfigService } from '../conversation/conversation-config-service'
import { NormalChatAgentRunsRepository } from '../repositories/agent-runs.repository'
import { NormalChatMessagesRepository } from '../repositories/messages.repository'
import { NormalChatTasksRepository } from '../repositories/tasks.repository'
import { NormalChatTurnTracesRepository } from '../repositories/turn-traces.repository'
import { nowIso } from '../shared/utils'
import { NormalChatWorkspaceService } from '../workspace/workspace-service'
import { NormalChatAgentRuntime } from './agent/agent-runtime'
import { NormalChatPromptBuilder } from './prompt/prompt-builder'
import { NormalChatQueueExecutor } from './scheduler/queue-executor'
import { NormalChatTaskScheduler } from './scheduler/task-scheduler'

export class NormalChatRuntimeService {
  constructor(
    private readonly db: Database.Database,
    private readonly workspaceService: NormalChatWorkspaceService,
    private readonly conversationConfigService: NormalChatConversationConfigService,
    private readonly messagesRepository: NormalChatMessagesRepository,
    private readonly turnTracesRepository: NormalChatTurnTracesRepository,
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly agentRunsRepository: NormalChatAgentRunsRepository,
    private readonly promptBuilder: NormalChatPromptBuilder,
    private readonly taskScheduler: NormalChatTaskScheduler,
    private readonly queueExecutor: NormalChatQueueExecutor,
    private readonly agentRuntime: NormalChatAgentRuntime
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

    const userMessage: NormalChatConversationMessage = {
      id: userMessageId,
      topicId: payload.topicId,
      requestId,
      role: 'user',
      parts: [{ kind: 'text', text: payload.input }],
      createdAt: timestamp,
      updatedAt: timestamp
    }

    const initialHistoryMessages = this.messagesRepository
      .listByTopic(payload.topicId)
      .slice(-Math.max(0, assistant.contextMemoryRounds * 2))

    const requestRecord = this.promptBuilder.buildRequestRecord({
      assistant,
      topic,
      providerId: payload.providerId,
      modelId: payload.modelId,
      input: payload.input
    })

    let rootAgentRun = null as ReturnType<NormalChatAgentRunsRepository['createRoot']> | null

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
        conversationId: conversation.id,
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
        conversationId: conversation.id,
        topicId: payload.topicId,
        assistantId: assistant.id,
        userInput: payload.input,
        resolvedConfig: this.promptBuilder.buildResolvedConfig({
          assistant,
          topic,
          conversationId: conversation.id,
          providerId: payload.providerId,
          modelId: payload.modelId
        }),
        historyMessages: initialHistoryMessages,
        promptInjections: conversation.programPromptInjections,
        requestPayload: requestRecord,
        timestamp
      })
      rootAgentRun = this.agentRunsRepository.createRoot({
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
            conversation,
            assistant,
            topic,
            userInput: payload.input,
            providerId: payload.providerId,
            modelId: payload.modelId,
            rootAgentRun: rootAgentRun as ReturnType<NormalChatAgentRunsRepository['createRoot']>,
            signal: controller.signal
          })
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
