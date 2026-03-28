import type Database from 'better-sqlite3'
import type {
  NormalChatConversationRuntimeTrace,
  NormalChatConversationTurnRequestRecord,
  NormalChatConversationTurnResponseRecord
} from '@preload/types'
import type { TurnTraceRow } from '../shared/rows'

export interface NormalChatTurnTraceRecord {
  requestId: string
  topicId: string
  assistantId: string
  assistantName: string
  assistantEmoji: string
  topicTitle: string
  requestRecordJson: string | null
  responseRecordJson: string | null
  runtimeTraceJson: string | null
}

// turn trace 关注的是单轮请求的“可追溯面”：请求记录、响应记录、运行时 trace。
export class NormalChatTurnTracesRepository {
  constructor(private readonly db: Database.Database) {}

  getByRequest(requestId: string): NormalChatTurnTraceRecord | null {
    const row = this.db
      .prepare('SELECT * FROM normal_chat_turn_traces WHERE request_id = ?')
      .get(requestId) as TurnTraceRow | undefined

    if (!row) {
      return null
    }

    return {
      requestId: row.request_id,
      topicId: row.topic_id,
      assistantId: row.assistant_id,
      assistantName: row.assistant_name,
      assistantEmoji: row.assistant_emoji,
      topicTitle: row.topic_title,
      requestRecordJson: row.request_record_json,
      responseRecordJson: row.response_record_json,
      runtimeTraceJson: row.runtime_trace_json
    }
  }

  create(input: {
    requestId: string
    topicId: string
    assistantId: string
    assistantName: string
    assistantEmoji: string
    topicTitle: string
    requestRecord: NormalChatConversationTurnRequestRecord
    responseRecord: NormalChatConversationTurnResponseRecord
    timestamp: string
  }): void {
    this.db
      .prepare(
        `INSERT INTO normal_chat_turn_traces
         (request_id, topic_id, assistant_id, assistant_name, assistant_emoji, topic_title,
          request_record_json, response_record_json, runtime_trace_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.requestId,
        input.topicId,
        input.assistantId,
        input.assistantName,
        input.assistantEmoji,
        input.topicTitle,
        JSON.stringify(input.requestRecord),
        JSON.stringify(input.responseRecord),
        null,
        input.timestamp,
        input.timestamp
      )
  }

  // 完成态会同时写回用户可见响应和 runtime trace，保证详情面板能一次读全。
  updateResponseAndRuntimeTrace(
    requestId: string,
    responseRecord: NormalChatConversationTurnResponseRecord,
    runtimeTrace: NormalChatConversationRuntimeTrace,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `UPDATE normal_chat_turn_traces
         SET response_record_json = ?, runtime_trace_json = ?, updated_at = ?
         WHERE request_id = ?`
      )
      .run(JSON.stringify(responseRecord), JSON.stringify(runtimeTrace), timestamp, requestId)
  }

  updateResponseRecord(
    requestId: string,
    responseRecord: NormalChatConversationTurnResponseRecord,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `UPDATE normal_chat_turn_traces
         SET response_record_json = ?, updated_at = ?
         WHERE request_id = ?`
      )
      .run(JSON.stringify(responseRecord), timestamp, requestId)
  }

  deleteByRequest(requestId: string): void {
    this.db.prepare('DELETE FROM normal_chat_turn_traces WHERE request_id = ?').run(requestId)
  }
}
