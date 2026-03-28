import type Database from 'better-sqlite3'
import type {
  NormalChatConversationRuntimeTrace,
  NormalChatConversationSnapshot,
  NormalChatConversationTurnDetail,
  NormalChatConversationTurnRequestRecord,
  NormalChatConversationTurnResponseRecord
} from '@preload/types'
import { NormalChatActionRunsRepository } from '../repositories/action-runs.repository'
import { NormalChatMessagesRepository } from '../repositories/messages.repository'
import { NormalChatModelCallsRepository } from '../repositories/model-calls.repository'
import { NormalChatTasksRepository } from '../repositories/tasks.repository'
import { NormalChatTurnTracesRepository } from '../repositories/turn-traces.repository'
import { parseJson } from '../shared/utils'

export class NormalChatConversationService {
  constructor(
    private readonly db: Database.Database,
    private readonly messagesRepository: NormalChatMessagesRepository,
    private readonly modelCallsRepository: NormalChatModelCallsRepository,
    private readonly turnTracesRepository: NormalChatTurnTracesRepository,
    private readonly tasksRepository: NormalChatTasksRepository,
    private readonly actionRunsRepository: NormalChatActionRunsRepository
  ) {}

  getConversation(topicId: string): NormalChatConversationSnapshot {
    return {
      topicId,
      messages: this.messagesRepository.listByTopic(topicId)
    }
  }

  getConversationTurnDetail(requestId: string): NormalChatConversationTurnDetail | null {
    const trace = this.turnTracesRepository.getByRequest(requestId)
    if (!trace) {
      return null
    }

    const task = this.tasksRepository.getByRequest(requestId)
    const runtimeTrace = parseJson(
      trace.runtimeTraceJson,
      null as NormalChatConversationRuntimeTrace | null
    )

    return {
      requestId: trace.requestId,
      topicId: trace.topicId,
      assistantId: trace.assistantId,
      assistantName: trace.assistantName,
      assistantEmoji: trace.assistantEmoji,
      topicTitle: trace.topicTitle,
      hasTrace: Boolean(runtimeTrace?.agentTree),
      requestRecord: parseJson(
        trace.requestRecordJson,
        null as NormalChatConversationTurnRequestRecord | null
      ),
      responseRecord: parseJson(
        trace.responseRecordJson,
        null as NormalChatConversationTurnResponseRecord | null
      ),
      runtimeTrace,
      messages: this.messagesRepository.listByRequest(requestId),
      modelCalls: this.modelCallsRepository.listByRequest(requestId),
      actionRuns: task ? this.actionRunsRepository.listByTaskId(task.id) : []
    }
  }

  deleteConversationTurn(requestId: string): void {
    const taskId = this.tasksRepository.getTaskIdByRequest(requestId)
    const transaction = this.db.transaction(() => {
      if (taskId) {
        this.tasksRepository.delete(taskId)
      }
      this.turnTracesRepository.deleteByRequest(requestId)
      this.messagesRepository.deleteByRequest(requestId)
    })
    transaction()
  }
}
