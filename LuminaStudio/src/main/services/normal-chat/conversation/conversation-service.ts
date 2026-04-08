import type Database from 'better-sqlite3'
import type { NormalChatConversationSnapshot, NormalChatTaskDetail } from '@preload/types'
import { NormalChatActionRunsRepository } from '../repositories/action-runs.repository'
import { NormalChatAgentRunsRepository } from '../repositories/agent-runs.repository'
import { NormalChatMessagesRepository } from '../repositories/messages.repository'
import { NormalChatModelCallsRepository } from '../repositories/model-calls.repository'
import { NormalChatRuntimeEventsRepository } from '../repositories/runtime-events.repository'
import { NormalChatTasksRepository } from '../repositories/tasks.repository'
import { findBestCapturedProviderRequest } from '../runtime/llm/providers/provider-request-capture'

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
    const modelCalls = this.modelCallsRepository.listByRequest(requestId)

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
      modelCalls: modelCalls.map((modelCall) => {
        let requestPayload: Record<string, unknown> = {}
        try {
          requestPayload = JSON.parse(modelCall.requestPayloadJson) as Record<string, unknown>
        } catch {
          requestPayload = {}
        }

        const providerId =
          typeof requestPayload.providerId === 'string'
            ? requestPayload.providerId
            : task.modelProviderId
        const modelId =
          typeof requestPayload.modelId === 'string' ? requestPayload.modelId : task.modelId
        const streaming =
          typeof requestPayload.streamingEnabled === 'boolean'
            ? requestPayload.streamingEnabled
            : executionSnapshot.runtime.streamingEnabled

        return {
          ...modelCall,
          rawProviderRequest: findBestCapturedProviderRequest({
            providerId,
            modelId,
            streaming,
            createdAt: modelCall.createdAt,
            startedAt: modelCall.startedAt
          })
        }
      }),
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
