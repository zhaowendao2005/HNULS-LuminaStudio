import type Database from 'better-sqlite3'
import type { NormalChatRequestHeadSnapshot } from '@preload/types'
import type { RequestHeadRow } from '../shared/rows'

/**
 * RequestHeadsRepository
 *
 * 这张表是 request 级索引头：
 * - 负责 topic / assistant / conversation 维度的快速检索
 * - 保存 request 当前状态、最后一条 entry seq、水位等元信息
 * - 不保存大块调试正文；真正的运行时事实一律由 request_entries 承担
 */
export class NormalChatRequestHeadsRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: NormalChatRequestHeadSnapshot): void {
    this.db
      .prepare(
        `INSERT INTO normal_chat_request_heads
         (request_id, assistant_id, topic_id, conversation_id, root_agent_run_id, user_message_id,
          assistant_message_id, status, phase, error_message, created_at, started_at, finished_at,
          updated_at, last_entry_seq)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.requestId,
        input.assistantId,
        input.topicId,
        input.conversationId,
        input.rootAgentRunId,
        input.userMessageId,
        input.assistantMessageId,
        input.status,
        input.phase,
        input.errorMessage,
        input.createdAt,
        input.startedAt,
        input.finishedAt,
        input.updatedAt,
        input.lastEntrySeq
      )
  }

  getByRequestId(requestId: string): NormalChatRequestHeadSnapshot | null {
    const row = this.db
      .prepare('SELECT * FROM normal_chat_request_heads WHERE request_id = ?')
      .get(requestId) as RequestHeadRow | undefined

    return row ? this.mapRow(row) : null
  }

  listByTopicId(topicId: string): NormalChatRequestHeadSnapshot[] {
    return (
      this.db
        .prepare(
          'SELECT * FROM normal_chat_request_heads WHERE topic_id = ? ORDER BY created_at, request_id'
        )
        .all(topicId) as RequestHeadRow[]
    ).map((row) => this.mapRow(row))
  }

  listByStatuses(statuses: NormalChatRequestHeadSnapshot['status'][]): NormalChatRequestHeadSnapshot[] {
    if (statuses.length === 0) {
      return []
    }

    const placeholders = statuses.map(() => '?').join(', ')
    return (
      this.db
        .prepare(
          `SELECT * FROM normal_chat_request_heads
           WHERE status IN (${placeholders})
           ORDER BY created_at, request_id`
        )
        .all(...statuses) as RequestHeadRow[]
    ).map((row) => this.mapRow(row))
  }

  updateStatus(input: {
    requestId: string
    status: NormalChatRequestHeadSnapshot['status']
    phase: NormalChatRequestHeadSnapshot['phase']
    errorMessage?: string | null
    assistantMessageId?: string | null
    startedAt?: string | null
    finishedAt?: string | null
    updatedAt: string
    lastEntrySeq?: number | null
  }): void {
    this.db
      .prepare(
        `UPDATE normal_chat_request_heads
         SET status = ?,
             phase = ?,
             error_message = ?,
             assistant_message_id = COALESCE(?, assistant_message_id),
             started_at = COALESCE(?, started_at),
             finished_at = COALESCE(?, finished_at),
             updated_at = ?,
             last_entry_seq = COALESCE(?, last_entry_seq)
         WHERE request_id = ?`
      )
      .run(
        input.status,
        input.phase,
        input.errorMessage ?? null,
        input.assistantMessageId ?? null,
        input.startedAt ?? null,
        input.finishedAt ?? null,
        input.updatedAt,
        input.lastEntrySeq ?? null,
        input.requestId
      )
  }

  delete(requestId: string): void {
    this.db.prepare('DELETE FROM normal_chat_request_heads WHERE request_id = ?').run(requestId)
  }

  private mapRow(row: RequestHeadRow): NormalChatRequestHeadSnapshot {
    return {
      requestId: row.request_id,
      assistantId: row.assistant_id,
      topicId: row.topic_id,
      conversationId: row.conversation_id,
      rootAgentRunId: row.root_agent_run_id,
      userMessageId: row.user_message_id,
      assistantMessageId: row.assistant_message_id,
      status: row.status,
      phase: row.phase,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      updatedAt: row.updated_at,
      lastEntrySeq: row.last_entry_seq
    }
  }
}
