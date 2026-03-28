import type Database from 'better-sqlite3'
import type { NormalChatTopic } from '@preload/types'
import { mapTopic } from '../shared/mappers'
import type { TopicRow } from '../shared/rows'
import { toDbBoolean } from '../shared/utils'

export class NormalChatTopicsRepository {
  constructor(private readonly db: Database.Database) {}

  countByAssistant(assistantId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM normal_chat_topics WHERE assistant_id = ?')
      .get(assistantId) as { count: number }
    return row.count
  }

  listByAssistant(assistantId: string): NormalChatTopic[] {
    return (
      this.db
        .prepare(
          'SELECT * FROM normal_chat_topics WHERE assistant_id = ? ORDER BY sort_order, created_at'
        )
        .all(assistantId) as TopicRow[]
    ).map(mapTopic)
  }

  listAll(): NormalChatTopic[] {
    return (
      this.db
        .prepare('SELECT * FROM normal_chat_topics ORDER BY assistant_id, sort_order, created_at')
        .all() as TopicRow[]
    ).map(mapTopic)
  }

  getById(topicId: string): NormalChatTopic | null {
    const row = this.db.prepare('SELECT * FROM normal_chat_topics WHERE id = ?').get(topicId) as
      | TopicRow
      | undefined

    return row ? mapTopic(row) : null
  }

  getByAssistantAndId(assistantId: string, topicId: string): NormalChatTopic | null {
    const row = this.db
      .prepare('SELECT * FROM normal_chat_topics WHERE assistant_id = ? AND id = ?')
      .get(assistantId, topicId) as TopicRow | undefined

    return row ? mapTopic(row) : null
  }

  getFirstTopicIdByAssistant(assistantId: string): string | null {
    const row = this.db
      .prepare(
        'SELECT id FROM normal_chat_topics WHERE assistant_id = ? ORDER BY sort_order, created_at LIMIT 1'
      )
      .get(assistantId) as { id: string } | undefined

    return row?.id ?? null
  }

  save(topic: NormalChatTopic, timestamp: string, isUpdate = false): void {
    const query = isUpdate
      ? `UPDATE normal_chat_topics
         SET title = ?, system_prompt_mode = ?, system_prompt_override = ?, streaming_mode = ?,
             streaming_enabled_override = ?, cost_mode = ?, cost_mode_override = ?, model_mode = ?,
             model_provider_id_override = ?, model_id_override = ?, context_memory_rounds_mode = ?,
             context_memory_rounds_override = ?, max_recursion_depth_mode = ?,
             max_recursion_depth_override = ?, max_reasoning_steps_mode = ?,
             max_reasoning_steps_override = ?, system_action_functioncall_mode = ?,
             system_action_functioncall_enabled_override = ?, system_action_subagent_mode = ?,
             system_action_subagent_enabled_override = ?, functioncall_pubmed_mode = ?,
             functioncall_pubmed_enabled_override = ?, functioncall_pubmed_execution_mode = ?,
             functioncall_pubmed_execution_mode_override = ?, mcp_mode = ?, mcp_enabled_override = ?,
             sort_order = ?, updated_at = ?
         WHERE id = ? AND assistant_id = ?`
      : `INSERT INTO normal_chat_topics
         (id, assistant_id, title, system_prompt_mode, system_prompt_override, streaming_mode,
          streaming_enabled_override, cost_mode, cost_mode_override, model_mode,
          model_provider_id_override, model_id_override, context_memory_rounds_mode,
          context_memory_rounds_override, max_recursion_depth_mode, max_recursion_depth_override,
          max_reasoning_steps_mode, max_reasoning_steps_override, system_action_functioncall_mode,
          system_action_functioncall_enabled_override, system_action_subagent_mode,
          system_action_subagent_enabled_override, functioncall_pubmed_mode,
          functioncall_pubmed_enabled_override, functioncall_pubmed_execution_mode,
          functioncall_pubmed_execution_mode_override, mcp_mode, mcp_enabled_override,
          sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    const params = isUpdate
      ? [
          topic.title,
          topic.systemPromptMode,
          topic.systemPromptOverride,
          topic.streamingMode,
          toDbBoolean(topic.streamingEnabledOverride),
          topic.costMode,
          topic.costModeOverride,
          topic.modelMode,
          topic.modelProviderIdOverride,
          topic.modelIdOverride,
          topic.contextMemoryRoundsMode,
          topic.contextMemoryRoundsOverride,
          topic.maxRecursionDepthMode,
          topic.maxRecursionDepthOverride,
          topic.maxReasoningStepsMode,
          topic.maxReasoningStepsOverride,
          topic.systemActionFunctionCallMode,
          toDbBoolean(topic.systemActionFunctionCallEnabledOverride),
          topic.systemActionSubAgentMode,
          toDbBoolean(topic.systemActionSubAgentEnabledOverride),
          topic.functionCallPubMedMode,
          toDbBoolean(topic.functionCallPubMedEnabledOverride),
          topic.functionCallPubMedExecutionMode,
          topic.functionCallPubMedExecutionModeOverride,
          topic.mcpMode,
          toDbBoolean(topic.mcpEnabledOverride),
          topic.sortOrder,
          timestamp,
          topic.id,
          topic.assistantId
        ]
      : [
          topic.id,
          topic.assistantId,
          topic.title,
          topic.systemPromptMode,
          topic.systemPromptOverride,
          topic.streamingMode,
          toDbBoolean(topic.streamingEnabledOverride),
          topic.costMode,
          topic.costModeOverride,
          topic.modelMode,
          topic.modelProviderIdOverride,
          topic.modelIdOverride,
          topic.contextMemoryRoundsMode,
          topic.contextMemoryRoundsOverride,
          topic.maxRecursionDepthMode,
          topic.maxRecursionDepthOverride,
          topic.maxReasoningStepsMode,
          topic.maxReasoningStepsOverride,
          topic.systemActionFunctionCallMode,
          toDbBoolean(topic.systemActionFunctionCallEnabledOverride),
          topic.systemActionSubAgentMode,
          toDbBoolean(topic.systemActionSubAgentEnabledOverride),
          topic.functionCallPubMedMode,
          toDbBoolean(topic.functionCallPubMedEnabledOverride),
          topic.functionCallPubMedExecutionMode,
          topic.functionCallPubMedExecutionModeOverride,
          topic.mcpMode,
          toDbBoolean(topic.mcpEnabledOverride),
          topic.sortOrder,
          timestamp,
          timestamp
        ]

    this.db.prepare(query).run(...params)
  }

  rename(assistantId: string, topicId: string, title: string, timestamp: string): void {
    this.db
      .prepare(
        'UPDATE normal_chat_topics SET title = ?, updated_at = ? WHERE id = ? AND assistant_id = ?'
      )
      .run(title, timestamp, topicId, assistantId)
  }

  delete(assistantId: string, topicId: string): void {
    this.db
      .prepare('DELETE FROM normal_chat_topics WHERE id = ? AND assistant_id = ?')
      .run(topicId, assistantId)
  }
}
