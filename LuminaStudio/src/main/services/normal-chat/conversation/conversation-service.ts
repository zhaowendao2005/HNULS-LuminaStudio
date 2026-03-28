import type Database from 'better-sqlite3'
import type {
  NormalChatConversationRuntimeTrace,
  NormalChatConversationSnapshot,
  NormalChatConversationTurnDetail,
  NormalChatConversationTurnRequestRecord,
  NormalChatConversationTurnResponseRecord
} from '@preload/types'
import { NormalChatMessagesRepository } from '../repositories/messages.repository'
import { NormalChatTasksRepository } from '../repositories/tasks.repository'
import { NormalChatTurnTracesRepository } from '../repositories/turn-traces.repository'
import { parseJson } from '../shared/utils'

// ConversationService 封装了消息与 turn trace 相关的查询/删除，避免 runtime 直接处理 SQL。
export class NormalChatConversationService {
  constructor(
    private readonly db: Database.Database,
    private readonly messagesRepository: NormalChatMessagesRepository,
    private readonly turnTracesRepository: NormalChatTurnTracesRepository,
    private readonly tasksRepository: NormalChatTasksRepository
  ) {}

  // getConversation 只读 topic 下的消息，把排序/序号逻辑集中在 repository。
  getConversation(topicId: string): NormalChatConversationSnapshot {
    return {
      topicId,
      messages: this.messagesRepository.listByTopic(topicId)
    }
  }

  // getConversationTurnDetail 负责把 trace + message 算作一个完整的 turn 视图，便于 renderer 展示。
  getConversationTurnDetail(requestId: string): NormalChatConversationTurnDetail | null {
    const trace = this.turnTracesRepository.getByRequest(requestId)
    if (!trace) {
      return null
    }

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
      messages: this.messagesRepository.listByRequest(requestId)
    }
  }

  // deleteConversationTurn 同时删掉 task / trace / message，保持多表一致性。
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
