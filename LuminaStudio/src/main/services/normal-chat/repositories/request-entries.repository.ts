import type Database from 'better-sqlite3'
import type { NormalChatRequestEntry } from '@preload/types'
import type { RequestEntryRow } from '../shared/rows'

/**
 * RequestEntriesRepository
 *
 * request_entries 是新的 append-only 运行时事实流：
 * - 每一行都代表一次不可变的状态变化
 * - projector 通过 request_id + seq 顺序回放得到 transcript / detail / agent graph
 * - 这里不做业务投影，只负责忠实写入和顺序读取
 */
export class NormalChatRequestEntriesRepository {
  constructor(private readonly db: Database.Database) {}

  append(input: Omit<NormalChatRequestEntry, 'seq'>): number {
    const result = this.db
      .prepare(
        `INSERT INTO normal_chat_request_entries
         (request_id, assistant_id, topic_id, conversation_id, entity_kind, entity_id,
          parent_entity_id, op, visibility, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.requestId,
        input.assistantId,
        input.topicId,
        input.conversationId,
        input.entityKind,
        input.entityId,
        input.parentEntityId,
        input.op,
        input.visibility,
        input.payloadJson,
        input.createdAt
      )

    return Number(result.lastInsertRowid)
  }

  listByRequestId(requestId: string, afterSeq = 0): NormalChatRequestEntry[] {
    return (
      this.db
        .prepare(
          `SELECT * FROM normal_chat_request_entries
           WHERE request_id = ? AND seq > ?
           ORDER BY seq`
        )
        .all(requestId, afterSeq) as RequestEntryRow[]
    ).map((row) => this.mapRow(row))
  }

  listByTopicId(topicId: string, afterSeq = 0): NormalChatRequestEntry[] {
    return (
      this.db
        .prepare(
          `SELECT * FROM normal_chat_request_entries
           WHERE topic_id = ? AND seq > ?
           ORDER BY seq`
        )
        .all(topicId, afterSeq) as RequestEntryRow[]
    ).map((row) => this.mapRow(row))
  }

  private mapRow(row: RequestEntryRow): NormalChatRequestEntry {
    return {
      seq: row.seq,
      requestId: row.request_id,
      assistantId: row.assistant_id,
      topicId: row.topic_id,
      conversationId: row.conversation_id,
      entityKind: row.entity_kind,
      entityId: row.entity_id,
      parentEntityId: row.parent_entity_id,
      op: row.op,
      visibility: row.visibility,
      payloadJson: row.payload_json,
      createdAt: row.created_at
    }
  }
}
