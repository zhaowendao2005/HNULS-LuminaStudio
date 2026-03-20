import type Database from 'better-sqlite3'
import type {
  NormalChatAssistant,
  NormalChatTopic,
  NormalChatTopicPromptMode
} from '@preload/types'

interface AssistantRow {
  id: string
  template_key: string
  name: string
  emoji: string
  default_system_prompt: string
  sort_order: number
}

interface TopicRow {
  id: string
  assistant_id: string
  title: string
  system_prompt_mode: NormalChatTopicPromptMode
  system_prompt_override: string | null
  sort_order: number
}

interface WorkspaceStateRow {
  active_assistant_id: string
  active_topic_id: string
}

export class NormalChatRepository {
  constructor(private readonly db: Database.Database) {}

  runInTransaction<T>(callback: () => T): T {
    return this.db.transaction(callback)()
  }

  listAssistants(): NormalChatAssistant[] {
    const rows = this.db
      .prepare(
        `
          SELECT id, template_key, name, emoji, default_system_prompt, sort_order
          FROM normal_chat_assistants
          ORDER BY sort_order ASC, created_at ASC
        `
      )
      .all() as AssistantRow[]

    return rows.map((row) => ({
      id: row.id,
      templateKey: row.template_key,
      name: row.name,
      emoji: row.emoji,
      defaultSystemPrompt: row.default_system_prompt,
      sortOrder: row.sort_order
    }))
  }

  getAssistantById(assistantId: string): NormalChatAssistant | null {
    const row = this.db
      .prepare(
        `
          SELECT id, template_key, name, emoji, default_system_prompt, sort_order
          FROM normal_chat_assistants
          WHERE id = ?
        `
      )
      .get(assistantId) as AssistantRow | undefined

    if (!row) {
      return null
    }

    return {
      id: row.id,
      templateKey: row.template_key,
      name: row.name,
      emoji: row.emoji,
      defaultSystemPrompt: row.default_system_prompt,
      sortOrder: row.sort_order
    }
  }

  insertAssistant(assistant: NormalChatAssistant): void {
    this.db
      .prepare(
        `
          INSERT INTO normal_chat_assistants (
            id,
            template_key,
            name,
            emoji,
            default_system_prompt,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        assistant.id,
        assistant.templateKey,
        assistant.name,
        assistant.emoji,
        assistant.defaultSystemPrompt,
        assistant.sortOrder
      )
  }

  updateAssistant(assistant: NormalChatAssistant): void {
    this.db
      .prepare(
        `
          UPDATE normal_chat_assistants
          SET
            name = ?,
            default_system_prompt = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `
      )
      .run(assistant.name, assistant.defaultSystemPrompt, assistant.id)
  }

  listAllTopics(): NormalChatTopic[] {
    const rows = this.db
      .prepare(
        `
          SELECT id, assistant_id, title, system_prompt_mode, system_prompt_override, sort_order
          FROM normal_chat_topics
          ORDER BY assistant_id ASC, sort_order ASC, created_at ASC
        `
      )
      .all() as TopicRow[]

    return rows.map((row) => ({
      id: row.id,
      assistantId: row.assistant_id,
      title: row.title,
      systemPromptMode: row.system_prompt_mode,
      systemPromptOverride: row.system_prompt_override,
      sortOrder: row.sort_order
    }))
  }

  listTopicsByAssistantId(assistantId: string): NormalChatTopic[] {
    const rows = this.db
      .prepare(
        `
          SELECT id, assistant_id, title, system_prompt_mode, system_prompt_override, sort_order
          FROM normal_chat_topics
          WHERE assistant_id = ?
          ORDER BY sort_order ASC, created_at ASC
        `
      )
      .all(assistantId) as TopicRow[]

    return rows.map((row) => ({
      id: row.id,
      assistantId: row.assistant_id,
      title: row.title,
      systemPromptMode: row.system_prompt_mode,
      systemPromptOverride: row.system_prompt_override,
      sortOrder: row.sort_order
    }))
  }

  getTopicById(topicId: string): NormalChatTopic | null {
    const row = this.db
      .prepare(
        `
          SELECT id, assistant_id, title, system_prompt_mode, system_prompt_override, sort_order
          FROM normal_chat_topics
          WHERE id = ?
        `
      )
      .get(topicId) as TopicRow | undefined

    if (!row) {
      return null
    }

    return {
      id: row.id,
      assistantId: row.assistant_id,
      title: row.title,
      systemPromptMode: row.system_prompt_mode,
      systemPromptOverride: row.system_prompt_override,
      sortOrder: row.sort_order
    }
  }

  insertTopic(topic: NormalChatTopic): void {
    this.db
      .prepare(
        `
          INSERT INTO normal_chat_topics (
            id,
            assistant_id,
            title,
            system_prompt_mode,
            system_prompt_override,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        topic.id,
        topic.assistantId,
        topic.title,
        topic.systemPromptMode,
        topic.systemPromptOverride,
        topic.sortOrder
      )
  }

  updateTopic(topic: NormalChatTopic): void {
    this.db
      .prepare(
        `
          UPDATE normal_chat_topics
          SET
            title = ?,
            system_prompt_mode = ?,
            system_prompt_override = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `
      )
      .run(topic.title, topic.systemPromptMode, topic.systemPromptOverride, topic.id)
  }

  deleteTopic(topicId: string): void {
    this.db.prepare(`DELETE FROM normal_chat_topics WHERE id = ?`).run(topicId)
  }

  getWorkspaceState(): WorkspaceStateRow | null {
    const row = this.db
      .prepare(
        `
          SELECT active_assistant_id, active_topic_id
          FROM normal_chat_workspace_state
          WHERE id = 1
        `
      )
      .get() as WorkspaceStateRow | undefined

    return row ?? null
  }

  upsertWorkspaceState(activeAssistantId: string, activeTopicId: string): void {
    this.db
      .prepare(
        `
          INSERT INTO normal_chat_workspace_state (
            id,
            active_assistant_id,
            active_topic_id,
            created_at,
            updated_at
          ) VALUES (1, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            active_assistant_id = excluded.active_assistant_id,
            active_topic_id = excluded.active_topic_id,
            updated_at = datetime('now')
        `
      )
      .run(activeAssistantId, activeTopicId)
  }
}
