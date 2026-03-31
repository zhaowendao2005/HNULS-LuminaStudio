import type Database from 'better-sqlite3'
import type { NormalChatConversationSnapshot, NormalChatTaskDetail } from '@preload/types'
import { NormalChatActionRunsRepository } from '../repositories/action-runs.repository'
import { NormalChatAgentRunsRepository } from '../repositories/agent-runs.repository'
import { NormalChatMessagesRepository } from '../repositories/messages.repository'
import { NormalChatModelCallsRepository } from '../repositories/model-calls.repository'
import { NormalChatRuntimeEventsRepository } from '../repositories/runtime-events.repository'
import { NormalChatTasksRepository } from '../repositories/tasks.repository'

export class NormalChatConversationService {
  constructor(
    private readonly db: Database.Database,
    private readonly messagesRepository: NormalChatMessagesRepository,
    private readonly modelCallsRepository: NormalChatModelCallsRepository,
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly actionRunsRepository: NormalChatActionRunsRepository,
    private readonly agentRunsRepository: NormalChatAgentRunsRepository,
    private readonly runtimeEventsRepository: NormalChatRuntimeEventsRepository
  ) {}

  getConversation(topicId: string): NormalChatConversationSnapshot {
    return {
      topicId,
      messages: this.messagesRepository.listByTopic(topicId)
    }
  }

  getConversationTurnDetail(requestId: string): NormalChatTaskDetail | null {
    const task = this.tasksRepository.getByRequest(requestId)
    if (!task) {
      return null
    }

    const executionSnapshot = task.executionSnapshot

    return {
      taskId: task.taskId,
      requestId: task.requestId,
      conversationId: task.conversationId,
      topicId: task.topicId,
      assistantId: task.assistantId,
      assistantName: executionSnapshot.assistant.name,
      assistantEmoji: executionSnapshot.assistant.emoji,
      topicTitle: executionSnapshot.topic.title,
      status: task.status,
      phase: task.phase,
      modelProviderId: task.modelProviderId,
      modelId: task.modelId,
      errorMessage: task.errorMessage,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      executionSnapshot,
      finalResponse: task.finalResponse,
      messages: this.messagesRepository.listByRequest(requestId),
      agentRuns: this.agentRunsRepository.listByTaskId(task.taskId),
      modelCalls: this.modelCallsRepository.listByRequest(requestId),
      actionRuns: this.actionRunsRepository.listByTaskId(task.taskId),
      runtimeEvents: this.runtimeEventsRepository.listByRequest(requestId)
    }
  }

  deleteConversationTurn(requestId: string): void {
    const taskId = this.tasksRepository.getTaskIdByRequest(requestId)
    const transaction = this.db.transaction(() => {
      if (taskId) {
        this.tasksRepository.delete(taskId)
      }
      this.messagesRepository.deleteByRequest(requestId)
    })
    transaction()
  }
}
