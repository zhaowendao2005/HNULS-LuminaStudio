import type Database from 'better-sqlite3'
import type { NormalChatConversationStreamEvent } from '@preload/types'

export class NormalChatRuntimeEventsRepository {
  constructor(private readonly db: Database.Database) {}

  insert(
    taskId: string,
    requestId: string,
    topicId: string,
    event: NormalChatConversationStreamEvent,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `INSERT INTO normal_chat_runtime_events
         (task_id, request_id, topic_id, event_type, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(taskId, requestId, topicId, event.type, JSON.stringify(event), timestamp)
  }
}
