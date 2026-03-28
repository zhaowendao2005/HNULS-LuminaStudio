import type Database from 'better-sqlite3'
import type { ConversationRow } from '../shared/rows'

export interface NormalChatConversationRecord {
  id: string
  topicId: string
  title: string
  agentTemplateId: string
  programPromptInjectionsJson: string
  createdAt: string
  updatedAt: string
}

export class NormalChatConversationsRepository {
  constructor(private readonly db: Database.Database) {}

  getFirstByTopic(topicId: string): NormalChatConversationRecord | null {
    const row = this.db
      .prepare(
        'SELECT * FROM normal_chat_conversations WHERE topic_id = ? ORDER BY created_at LIMIT 1'
      )
      .get(topicId) as ConversationRow | undefined

    return row ? this.mapRow(row) : null
  }

  create(input: {
    id: string
    topicId: string
    title: string
    agentTemplateId: string
    programPromptInjectionsJson: string
    timestamp: string
  }): NormalChatConversationRecord {
    this.db
      .prepare(
        `INSERT INTO normal_chat_conversations
         (id, topic_id, title, agent_template_id, program_prompt_injections_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.topicId,
        input.title,
        input.agentTemplateId,
        input.programPromptInjectionsJson,
        input.timestamp,
        input.timestamp
      )

    return {
      id: input.id,
      topicId: input.topicId,
      title: input.title,
      agentTemplateId: input.agentTemplateId,
      programPromptInjectionsJson: input.programPromptInjectionsJson,
      createdAt: input.timestamp,
      updatedAt: input.timestamp
    }
  }

  private mapRow(row: ConversationRow): NormalChatConversationRecord {
    return {
      id: row.id,
      topicId: row.topic_id,
      title: row.title,
      agentTemplateId: row.agent_template_id,
      programPromptInjectionsJson: row.program_prompt_injections_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
