import type Database from 'better-sqlite3'
import type {
  NormalChatConversationMessage,
  NormalChatConversationTurnDetail,
  NormalChatConversationTurnRequestRecord,
  NormalChatConversationTurnResponseRecord,
  NormalChatConversationRuntimeTrace,
  NormalChatCallMode,
  NormalChatCostMode,
  NormalChatFunctionCallMessagePart,
  NormalChatLabel,
  NormalChatAssistant,
  NormalChatTopic,
  NormalChatTopicPromptMode
} from '@preload/types'

interface LabelRow {
  id: string
  name: string
  sort_order: number
}

interface AssistantRow {
  id: string
  template_key: string
  name: string
  emoji: string
  label_id: string | null
  default_system_prompt: string
  save_full_conversation_enabled: number
  streaming_enabled: number
  call_mode: NormalChatCallMode
  cost_mode: NormalChatCostMode
  max_recursion_depth: number
  max_retries_per_agent: number
  sort_order: number
}

interface TopicRow {
  id: string
  assistant_id: string
  title: string
  system_prompt_mode: NormalChatTopicPromptMode
  system_prompt_override: string | null
  streaming_mode: 'inherit' | 'override'
  streaming_enabled_override: number | null
  sort_order: number
}

interface WorkspaceStateRow {
  active_assistant_id: string
  active_topic_id: string
}

interface MessageRow {
  id: string
  topic_id: string
  request_id: string
  message_role: 'user' | 'assistant'
  parts_json: string
  sort_order: number
  created_at: string
  updated_at: string
}

interface ConversationTurnTraceRow {
  request_id: string
  topic_id: string
  assistant_id: string
  assistant_name: string
  assistant_emoji: string
  topic_title: string
  save_full_conversation_enabled: number
  request_record_json: string
  response_record_json: string
  runtime_trace_json: string
  created_at: string
  updated_at: string
}

export class NormalChatRepository {
  constructor(private readonly db: Database.Database) {}

  runInTransaction<T>(callback: () => T): T {
    return this.db.transaction(callback)()
  }

  listLabels(): NormalChatLabel[] {
    const rows = this.db
      .prepare(
        `
          SELECT id, name, sort_order
          FROM normal_chat_labels
          ORDER BY sort_order ASC, created_at ASC
        `
      )
      .all() as LabelRow[]

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order
    }))
  }

  getLabelById(labelId: string): NormalChatLabel | null {
    const row = this.db
      .prepare(
        `
          SELECT id, name, sort_order
          FROM normal_chat_labels
          WHERE id = ?
        `
      )
      .get(labelId) as LabelRow | undefined

    if (!row) {
      return null
    }

    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order
    }
  }

  insertLabel(label: NormalChatLabel): void {
    this.db
      .prepare(
        `
          INSERT INTO normal_chat_labels (
            id,
            name,
            sort_order
          ) VALUES (?, ?, ?)
        `
      )
      .run(label.id, label.name, label.sortOrder)
  }

  updateLabel(label: NormalChatLabel): void {
    this.db
      .prepare(
        `
          UPDATE normal_chat_labels
          SET
            name = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `
      )
      .run(label.name, label.id)
  }

  deleteLabel(labelId: string): void {
    this.db.prepare(`DELETE FROM normal_chat_labels WHERE id = ?`).run(labelId)
  }

  listAssistants(): NormalChatAssistant[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            id,
            template_key,
            name,
            emoji,
            label_id,
            default_system_prompt,
            save_full_conversation_enabled,
            streaming_enabled,
            call_mode,
            cost_mode,
            max_recursion_depth,
            max_retries_per_agent,
            sort_order
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
      labelId: row.label_id,
      defaultSystemPrompt: row.default_system_prompt,
      saveFullConversationEnabled: Boolean(row.save_full_conversation_enabled),
      streamingEnabled: Boolean(row.streaming_enabled),
      callMode: row.call_mode,
      costMode: row.cost_mode,
      maxRecursionDepth: row.max_recursion_depth,
      maxRetriesPerAgent: row.max_retries_per_agent,
      sortOrder: row.sort_order
    }))
  }

  getAssistantById(assistantId: string): NormalChatAssistant | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            template_key,
            name,
            emoji,
            label_id,
            default_system_prompt,
            save_full_conversation_enabled,
            streaming_enabled,
            call_mode,
            cost_mode,
            max_recursion_depth,
            max_retries_per_agent,
            sort_order
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
      labelId: row.label_id,
      defaultSystemPrompt: row.default_system_prompt,
      saveFullConversationEnabled: Boolean(row.save_full_conversation_enabled),
      streamingEnabled: Boolean(row.streaming_enabled),
      callMode: row.call_mode,
      costMode: row.cost_mode,
      maxRecursionDepth: row.max_recursion_depth,
      maxRetriesPerAgent: row.max_retries_per_agent,
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
            label_id,
            default_system_prompt,
            save_full_conversation_enabled,
            streaming_enabled,
            call_mode,
            cost_mode,
            max_recursion_depth,
            max_retries_per_agent,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        assistant.id,
        assistant.templateKey,
        assistant.name,
        assistant.emoji,
        assistant.labelId,
        assistant.defaultSystemPrompt,
        assistant.saveFullConversationEnabled ? 1 : 0,
        assistant.streamingEnabled ? 1 : 0,
        assistant.callMode,
        assistant.costMode,
        assistant.maxRecursionDepth,
        assistant.maxRetriesPerAgent,
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
            label_id = ?,
            default_system_prompt = ?,
            save_full_conversation_enabled = ?,
            streaming_enabled = ?,
            call_mode = ?,
            cost_mode = ?,
            max_recursion_depth = ?,
            max_retries_per_agent = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `
      )
      .run(
        assistant.name,
        assistant.labelId,
        assistant.defaultSystemPrompt,
        assistant.saveFullConversationEnabled ? 1 : 0,
        assistant.streamingEnabled ? 1 : 0,
        assistant.callMode,
        assistant.costMode,
        assistant.maxRecursionDepth,
        assistant.maxRetriesPerAgent,
        assistant.id
      )
  }

  listAllTopics(): NormalChatTopic[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            id,
            assistant_id,
            title,
            system_prompt_mode,
            system_prompt_override,
            streaming_mode,
            streaming_enabled_override,
            sort_order
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
      streamingMode: row.streaming_mode,
      streamingEnabledOverride:
        typeof row.streaming_enabled_override === 'number'
          ? Boolean(row.streaming_enabled_override)
          : null,
      sortOrder: row.sort_order
    }))
  }

  listTopicsByAssistantId(assistantId: string): NormalChatTopic[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            id,
            assistant_id,
            title,
            system_prompt_mode,
            system_prompt_override,
            streaming_mode,
            streaming_enabled_override,
            sort_order
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
      streamingMode: row.streaming_mode,
      streamingEnabledOverride:
        typeof row.streaming_enabled_override === 'number'
          ? Boolean(row.streaming_enabled_override)
          : null,
      sortOrder: row.sort_order
    }))
  }

  getTopicById(topicId: string): NormalChatTopic | null {
    const row = this.db
      .prepare(
        `
          SELECT
            id,
            assistant_id,
            title,
            system_prompt_mode,
            system_prompt_override,
            streaming_mode,
            streaming_enabled_override,
            sort_order
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
      streamingMode: row.streaming_mode,
      streamingEnabledOverride:
        typeof row.streaming_enabled_override === 'number'
          ? Boolean(row.streaming_enabled_override)
          : null,
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
            streaming_mode,
            streaming_enabled_override,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        topic.id,
        topic.assistantId,
        topic.title,
        topic.systemPromptMode,
        topic.systemPromptOverride,
        topic.streamingMode,
        topic.streamingEnabledOverride === null ? null : topic.streamingEnabledOverride ? 1 : 0,
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
            streaming_mode = ?,
            streaming_enabled_override = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `
      )
      .run(
        topic.title,
        topic.systemPromptMode,
        topic.systemPromptOverride,
        topic.streamingMode,
        topic.streamingEnabledOverride === null ? null : topic.streamingEnabledOverride ? 1 : 0,
        topic.id
      )
  }

  deleteTopic(topicId: string): void {
    this.db.prepare(`DELETE FROM normal_chat_topics WHERE id = ?`).run(topicId)
  }

  listMessagesByTopicId(topicId: string): NormalChatConversationMessage[] {
    const rows = this.db
      .prepare(
        `
          SELECT
            id,
            topic_id,
            request_id,
            message_role,
            parts_json,
            sort_order,
            created_at,
            updated_at
          FROM normal_chat_messages
          WHERE topic_id = ?
          ORDER BY sort_order ASC, created_at ASC
        `
      )
      .all(topicId) as MessageRow[]

    return rows.map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      requestId: row.request_id,
      role: row.message_role,
      parts: this.parseMessageParts(row.parts_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  listMessagesByRequestId(requestId: string): NormalChatConversationMessage[] {
    const rows = this.db
      .prepare(
        `
          SELECT id, topic_id, request_id, message_role, parts_json, sort_order, created_at, updated_at
          FROM normal_chat_messages
          WHERE request_id = ?
          ORDER BY sort_order ASC, created_at ASC
        `
      )
      .all(requestId) as MessageRow[]

    return rows.map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      requestId: row.request_id,
      role: row.message_role,
      parts: this.parseMessageParts(row.parts_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  insertMessage(message: NormalChatConversationMessage, sortOrder: number): void {
    this.db
      .prepare(
        `
          INSERT INTO normal_chat_messages (
            id,
            topic_id,
            request_id,
            message_role,
            parts_json,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        message.id,
        message.topicId,
        message.requestId,
        message.role,
        JSON.stringify(message.parts),
        sortOrder
      )
  }

  deleteMessagesByRequestId(requestId: string): void {
    this.db.prepare(`DELETE FROM normal_chat_messages WHERE request_id = ?`).run(requestId)
  }

  insertConversationTurnTrace(payload: NormalChatConversationTurnDetail): void {
    this.db
      .prepare(
        `
          INSERT INTO normal_chat_turn_traces (
            request_id,
            topic_id,
            assistant_id,
            assistant_name,
            assistant_emoji,
            topic_title,
            save_full_conversation_enabled,
            request_record_json,
            response_record_json,
            runtime_trace_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        payload.requestId,
        payload.topicId,
        payload.assistantId,
        payload.assistantName,
        payload.assistantEmoji,
        payload.topicTitle,
        payload.saveFullConversationEnabled ? 1 : 0,
        JSON.stringify(payload.requestRecord ?? null),
        JSON.stringify(payload.responseRecord ?? null),
        JSON.stringify(payload.runtimeTrace ?? null)
      )
  }

  updateConversationTurnTrace(payload: NormalChatConversationTurnDetail): void {
    this.db
      .prepare(
        `
          UPDATE normal_chat_turn_traces
          SET
            topic_id = ?,
            assistant_id = ?,
            assistant_name = ?,
            assistant_emoji = ?,
            topic_title = ?,
            save_full_conversation_enabled = ?,
            request_record_json = ?,
            response_record_json = ?,
            runtime_trace_json = ?,
            updated_at = datetime('now')
          WHERE request_id = ?
        `
      )
      .run(
        payload.topicId,
        payload.assistantId,
        payload.assistantName,
        payload.assistantEmoji,
        payload.topicTitle,
        payload.saveFullConversationEnabled ? 1 : 0,
        JSON.stringify(payload.requestRecord ?? null),
        JSON.stringify(payload.responseRecord ?? null),
        JSON.stringify(payload.runtimeTrace ?? null),
        payload.requestId
      )
  }

  getConversationTurnTrace(requestId: string): NormalChatConversationTurnDetail | null {
    const row = this.db
      .prepare(
        `
          SELECT
            request_id,
            topic_id,
            assistant_id,
            assistant_name,
            assistant_emoji,
            topic_title,
            save_full_conversation_enabled,
            request_record_json,
            response_record_json,
            runtime_trace_json,
            created_at,
            updated_at
          FROM normal_chat_turn_traces
          WHERE request_id = ?
        `
      )
      .get(requestId) as ConversationTurnTraceRow | undefined

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
      saveFullConversationEnabled: Boolean(row.save_full_conversation_enabled),
      hasTrace: Boolean(
        row.request_record_json || row.response_record_json || row.runtime_trace_json
      ),
      requestRecord: this.parseConversationRequestRecord(row.request_record_json),
      responseRecord: this.parseConversationResponseRecord(row.response_record_json),
      runtimeTrace: this.parseConversationRuntimeTrace(row.runtime_trace_json),
      messages: this.listMessagesByRequestId(requestId)
    }
  }

  deleteConversationTurn(requestId: string): void {
    this.deleteMessagesByRequestId(requestId)
    this.db.prepare(`DELETE FROM normal_chat_turn_traces WHERE request_id = ?`).run(requestId)
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

  private parseMessageParts(partsJson: string): NormalChatConversationMessage['parts'] {
    try {
      const parsed = JSON.parse(partsJson) as unknown
      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed
        .map((part) => {
          if (!part || typeof part !== 'object') {
            return null
          }

          const nextPart = part as {
            kind?: unknown
            text?: unknown
            callId?: unknown
            functionCallName?: unknown
            title?: unknown
            status?: unknown
            input?: unknown
            output?: unknown
            errorMessage?: unknown
            isStreaming?: unknown
            roundIndex?: unknown
            batchIndex?: unknown
            parallelIndex?: unknown
            depth?: unknown
            decisionReason?: unknown
          }

          if (nextPart.kind === 'text' && typeof nextPart.text === 'string') {
            return {
              kind: 'text' as const,
              text: nextPart.text
            }
          }

          if (
            nextPart.kind === 'functioncall' &&
            typeof nextPart.callId === 'string' &&
            typeof nextPart.functionCallName === 'string' &&
            typeof nextPart.title === 'string' &&
            typeof nextPart.status === 'string' &&
            typeof nextPart.input === 'string' &&
            typeof nextPart.output === 'string' &&
            (nextPart.errorMessage === null || typeof nextPart.errorMessage === 'string')
          ) {
            const status = nextPart.status as NormalChatFunctionCallMessagePart['status']
            if (!['queued', 'running', 'success', 'error', 'aborted'].includes(status)) {
              return null
            }

            return {
              kind: 'functioncall' as const,
              callId: nextPart.callId,
              functionCallName: nextPart.functionCallName,
              title: nextPart.title,
              status,
              input: nextPart.input,
              output: nextPart.output,
              errorMessage: (nextPart.errorMessage as string | null) ?? null,
              isStreaming: Boolean(nextPart.isStreaming),
              roundIndex: typeof nextPart.roundIndex === 'number' ? nextPart.roundIndex : 0,
              batchIndex: typeof nextPart.batchIndex === 'number' ? nextPart.batchIndex : 0,
              parallelIndex:
                typeof nextPart.parallelIndex === 'number' ? nextPart.parallelIndex : 0,
              depth: typeof nextPart.depth === 'number' ? nextPart.depth : 0,
              decisionReason:
                typeof nextPart.decisionReason === 'string' ? nextPart.decisionReason : null
            }
          }

          return null
        })
        .filter(
          (part): part is { kind: 'text'; text: string } | NormalChatFunctionCallMessagePart =>
            part !== null
        )
    } catch {
      return []
    }
  }

  private parseConversationRequestRecord(
    payloadJson: string
  ): NormalChatConversationTurnRequestRecord | null {
    try {
      const parsed = JSON.parse(payloadJson) as unknown
      if (!parsed || typeof parsed !== 'object') {
        return null
      }

      return parsed as NormalChatConversationTurnRequestRecord
    } catch {
      return null
    }
  }

  private parseConversationResponseRecord(
    payloadJson: string
  ): NormalChatConversationTurnResponseRecord | null {
    try {
      const parsed = JSON.parse(payloadJson) as unknown
      if (!parsed || typeof parsed !== 'object') {
        return null
      }

      return parsed as NormalChatConversationTurnResponseRecord
    } catch {
      return null
    }
  }

  private parseConversationRuntimeTrace(
    payloadJson: string
  ): NormalChatConversationRuntimeTrace | null {
    try {
      const parsed = JSON.parse(payloadJson) as unknown
      if (!parsed || typeof parsed !== 'object') {
        return null
      }

      return parsed as NormalChatConversationRuntimeTrace
    } catch {
      return null
    }
  }
}
