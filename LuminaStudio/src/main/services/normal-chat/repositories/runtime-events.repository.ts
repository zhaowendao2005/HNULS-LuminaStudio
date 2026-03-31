import type Database from 'better-sqlite3'
import type {
  NormalChatConversationStreamEvent,
  NormalChatRuntimeEventSnapshot
} from '@preload/types'
import type { RuntimeEventRow } from '../shared/rows'

export class NormalChatRuntimeEventsRepository {
  constructor(private readonly db: Database.Database) {}

  insert(
    taskId: string,
    requestId: string,
    topicId: string,
    event: NormalChatConversationStreamEvent,
    timestamp: string
  ): number {
    const result = this.db
      .prepare(
        `INSERT INTO normal_chat_runtime_events
         (task_id, request_id, topic_id, event_type, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(taskId, requestId, topicId, event.type, JSON.stringify(event), timestamp)

    return Number(result.lastInsertRowid)
  }

  listByRequest(requestId: string): NormalChatRuntimeEventSnapshot[] {
    return (
      this.db
        .prepare(
          `SELECT * FROM normal_chat_runtime_events
           WHERE request_id = ?
           ORDER BY seq`
        )
        .all(requestId) as RuntimeEventRow[]
    ).map((row) => ({
      seq: row.seq,
      taskId: row.task_id,
      requestId: row.request_id,
      topicId: row.topic_id,
      eventType: row.event_type,
      payloadJson: row.payload_json,
      createdAt: row.created_at
    }))
  }
}
