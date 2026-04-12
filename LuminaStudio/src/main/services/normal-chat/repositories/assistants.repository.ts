import type Database from 'better-sqlite3'
import type { NormalChatAssistant } from '@preload/types'
import { mapAssistant } from '../shared/mappers'
import type { AssistantRow } from '../shared/rows'
import { toDbBoolean } from '../shared/utils'

export class NormalChatAssistantsRepository {
  constructor(private readonly db: Database.Database) {}

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM normal_chat_assistants').get() as {
      count: number
    }
    return row.count
  }

  list(): NormalChatAssistant[] {
    return (
      this.db
        .prepare('SELECT * FROM normal_chat_assistants ORDER BY sort_order, created_at')
        .all() as AssistantRow[]
    ).map(mapAssistant)
  }

  getById(assistantId: string): NormalChatAssistant | null {
    const row = this.db
      .prepare('SELECT * FROM normal_chat_assistants WHERE id = ?')
      .get(assistantId) as AssistantRow | undefined

    return row ? mapAssistant(row) : null
  }

  getFirstAssistantId(): string | null {
    const row = this.db
      .prepare('SELECT id FROM normal_chat_assistants ORDER BY sort_order, created_at LIMIT 1')
      .get() as { id: string } | undefined

    return row?.id ?? null
  }

  delete(assistantId: string): void {
    this.db.prepare('DELETE FROM normal_chat_assistants WHERE id = ?').run(assistantId)
  }

  save(assistant: NormalChatAssistant, timestamp: string, isUpdate = false): void {
    const query = isUpdate
      ? `UPDATE normal_chat_assistants
         SET name = ?, emoji = ?, label_id = ?, default_system_prompt = ?, streaming_enabled = ?,
             call_mode = ?, cost_mode = ?, default_model_provider_id = ?, default_model_id = ?,
             context_memory_rounds = ?, max_recursion_depth = ?, max_reasoning_steps = ?,
             system_action_functioncall_enabled = ?, system_action_subagent_enabled = ?,
             functioncall_pubmed_enabled = ?, functioncall_pubmed_mode = ?,
             functioncall_knowledge_retrieval_enabled = ?, functioncall_knowledge_retrieval_mode = ?,
             functioncall_kg_retrieval_enabled = ?, functioncall_kg_retrieval_mode = ?,
             mcp_enabled = ?, persistence_preset = ?, sort_order = ?, updated_at = ?
         WHERE id = ?`
      : `INSERT INTO normal_chat_assistants
         (id, name, emoji, label_id, default_system_prompt, streaming_enabled, call_mode, cost_mode,
          default_model_provider_id, default_model_id, context_memory_rounds, max_recursion_depth,
          max_reasoning_steps, system_action_functioncall_enabled, system_action_subagent_enabled,
          functioncall_pubmed_enabled, functioncall_pubmed_mode,
          functioncall_knowledge_retrieval_enabled, functioncall_knowledge_retrieval_mode,
          functioncall_kg_retrieval_enabled, functioncall_kg_retrieval_mode,
          mcp_enabled, persistence_preset, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    const params = isUpdate
      ? [
          assistant.name,
          assistant.emoji,
          assistant.labelId,
          assistant.defaultSystemPrompt,
          toDbBoolean(assistant.streamingEnabled),
          assistant.callMode,
          assistant.costMode,
          assistant.defaultModelProviderId,
          assistant.defaultModelId,
          assistant.contextMemoryRounds,
          assistant.maxRecursionDepth,
          assistant.maxReasoningSteps,
          toDbBoolean(assistant.systemActionFunctionCallEnabled),
          toDbBoolean(assistant.systemActionSubAgentEnabled),
          toDbBoolean(assistant.functionCallPubMedEnabled),
          assistant.functionCallPubMedMode,
          toDbBoolean(assistant.functionCallKnowledgeRetrievalEnabled),
          assistant.functionCallKnowledgeRetrievalMode,
          toDbBoolean(assistant.functionCallKgRetrievalEnabled),
          assistant.functionCallKgRetrievalMode,
          toDbBoolean(assistant.mcpEnabled),
          assistant.persistencePreset,
          assistant.sortOrder,
          timestamp,
          assistant.id
        ]
      : [
          assistant.id,
          assistant.name,
          assistant.emoji,
          assistant.labelId,
          assistant.defaultSystemPrompt,
          toDbBoolean(assistant.streamingEnabled),
          assistant.callMode,
          assistant.costMode,
          assistant.defaultModelProviderId,
          assistant.defaultModelId,
          assistant.contextMemoryRounds,
          assistant.maxRecursionDepth,
          assistant.maxReasoningSteps,
          toDbBoolean(assistant.systemActionFunctionCallEnabled),
          toDbBoolean(assistant.systemActionSubAgentEnabled),
          toDbBoolean(assistant.functionCallPubMedEnabled),
          assistant.functionCallPubMedMode,
          toDbBoolean(assistant.functionCallKnowledgeRetrievalEnabled),
          assistant.functionCallKnowledgeRetrievalMode,
          toDbBoolean(assistant.functionCallKgRetrievalEnabled),
          assistant.functionCallKgRetrievalMode,
          toDbBoolean(assistant.mcpEnabled),
          assistant.persistencePreset,
          assistant.sortOrder,
          timestamp,
          timestamp
        ]

    this.db.prepare(query).run(...params)
  }

  assignLabel(assistantId: string, labelId: string | null, timestamp: string): void {
    this.db
      .prepare('UPDATE normal_chat_assistants SET label_id = ?, updated_at = ? WHERE id = ?')
      .run(labelId, timestamp, assistantId)
  }

  clearLabelAssignments(labelId: string, timestamp: string): void {
    this.db
      .prepare(
        'UPDATE normal_chat_assistants SET label_id = NULL, updated_at = ? WHERE label_id = ?'
      )
      .run(timestamp, labelId)
  }
}
