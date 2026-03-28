import type Database from 'better-sqlite3'
import type { WorkspaceStateRow } from '../shared/rows'

export class NormalChatWorkspaceStateRepository {
  constructor(private readonly db: Database.Database) {}

  get(): WorkspaceStateRow | null {
    const row = this.db
      .prepare(
        'SELECT active_assistant_id, active_topic_id FROM normal_chat_workspace_state WHERE id = 1'
      )
      .get() as WorkspaceStateRow | undefined

    return row ?? null
  }

  set(assistantId: string, topicId: string, timestamp: string): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO normal_chat_workspace_state
         (id, active_assistant_id, active_topic_id, created_at, updated_at)
         VALUES (1, ?, ?, COALESCE((SELECT created_at FROM normal_chat_workspace_state WHERE id = 1), ?), ?)`
      )
      .run(assistantId, topicId, timestamp, timestamp)
  }
}
