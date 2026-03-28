import type Database from 'better-sqlite3'
import { DEFAULT_ACTION_POLICIES } from '../shared/defaults'

export class NormalChatAssistantActionPoliciesRepository {
  constructor(private readonly db: Database.Database) {}

  seedDefaultPolicies(assistantId: string, timestamp: string): void {
    const statement = this.db.prepare(
      `INSERT INTO normal_chat_assistant_action_policies
       (assistant_id, action_key, action_kind, enabled, mode, config_json, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?)`
    )

    DEFAULT_ACTION_POLICIES.forEach(([actionKey, actionKind, enabled, mode], index) => {
      statement.run(assistantId, actionKey, actionKind, enabled, mode, index, timestamp, timestamp)
    })
  }
}
