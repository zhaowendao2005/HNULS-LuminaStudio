import type Database from 'better-sqlite3'
import type { NormalChatConversationMessage } from '@preload/types'
import { mapMessage } from '../shared/mappers'
import type { MessageRow } from '../shared/rows'

export class NormalChatMessagesRepository {
  constructor(private readonly db: Database.Database) {}

  countByTopic(topicId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM normal_chat_messages WHERE topic_id = ?')
      .get(topicId) as { count: number }
    return row.count
  }

  listByTopic(topicId: string): NormalChatConversationMessage[] {
    return (
      this.db
        .prepare(
          'SELECT * FROM normal_chat_messages WHERE topic_id = ? ORDER BY sort_order, created_at'
        )
        .all(topicId) as MessageRow[]
    ).map(mapMessage)
  }

  listByRequest(requestId: string): NormalChatConversationMessage[] {
    return (
      this.db
        .prepare(
          'SELECT * FROM normal_chat_messages WHERE request_id = ? ORDER BY sort_order, created_at'
        )
        .all(requestId) as MessageRow[]
    ).map(mapMessage)
  }

  insert(message: NormalChatConversationMessage): void {
    const sortOrder = this.countByTopic(message.topicId)
    this.db
      .prepare(
        `INSERT INTO normal_chat_messages
         (id, topic_id, request_id, message_role, parts_json, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        message.id,
        message.topicId,
        message.requestId,
        message.role,
        JSON.stringify(message.parts),
        sortOrder,
        message.createdAt,
        message.updatedAt
      )
  }

  deleteByRequest(requestId: string): void {
    this.db.prepare('DELETE FROM normal_chat_messages WHERE request_id = ?').run(requestId)
  }
}
