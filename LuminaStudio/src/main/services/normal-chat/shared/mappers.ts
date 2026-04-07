import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatTopic
} from '@preload/types'
import type { AssistantRow, MessageRow, TopicRow } from './rows'
import { fromDbBoolean, parseJson } from './utils'

export function mapAssistant(row: AssistantRow): NormalChatAssistant {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    labelId: row.label_id,
    defaultSystemPrompt: row.default_system_prompt,
    streamingEnabled: fromDbBoolean(row.streaming_enabled, true),
    callMode: row.call_mode,
    costMode: row.cost_mode,
    defaultModelProviderId: row.default_model_provider_id,
    defaultModelId: row.default_model_id,
    contextMemoryRounds: row.context_memory_rounds,
    maxRecursionDepth: row.max_recursion_depth,
    maxReasoningSteps: row.max_reasoning_steps,
    systemActionFunctionCallEnabled: fromDbBoolean(row.system_action_functioncall_enabled, true),
    systemActionSubAgentEnabled: fromDbBoolean(row.system_action_subagent_enabled, true),
    functionCallPubMedEnabled: fromDbBoolean(row.functioncall_pubmed_enabled, true),
    functionCallPubMedMode: row.functioncall_pubmed_mode,
    mcpEnabled: fromDbBoolean(row.mcp_enabled),
    persistencePreset: row.persistence_preset,
    sortOrder: row.sort_order
  }
}

export function mapTopic(row: TopicRow): NormalChatTopic {
  return {
    id: row.id,
    assistantId: row.assistant_id,
    title: row.title,
    systemPromptMode: row.system_prompt_mode,
    systemPromptOverride: row.system_prompt_override,
    streamingMode: row.streaming_mode,
    streamingEnabledOverride:
      row.streaming_enabled_override === null
        ? null
        : fromDbBoolean(row.streaming_enabled_override),
    costMode: row.cost_mode,
    costModeOverride: row.cost_mode_override,
    modelMode: row.model_mode,
    modelProviderIdOverride: row.model_provider_id_override,
    modelIdOverride: row.model_id_override,
    contextMemoryRoundsMode: row.context_memory_rounds_mode,
    contextMemoryRoundsOverride: row.context_memory_rounds_override,
    maxRecursionDepthMode: row.max_recursion_depth_mode,
    maxRecursionDepthOverride: row.max_recursion_depth_override,
    maxReasoningStepsMode: row.max_reasoning_steps_mode,
    maxReasoningStepsOverride: row.max_reasoning_steps_override,
    systemActionFunctionCallMode: row.system_action_functioncall_mode,
    systemActionFunctionCallEnabledOverride:
      row.system_action_functioncall_enabled_override === null
        ? null
        : fromDbBoolean(row.system_action_functioncall_enabled_override),
    systemActionSubAgentMode: row.system_action_subagent_mode,
    systemActionSubAgentEnabledOverride:
      row.system_action_subagent_enabled_override === null
        ? null
        : fromDbBoolean(row.system_action_subagent_enabled_override),
    functionCallPubMedMode: row.functioncall_pubmed_mode,
    functionCallPubMedEnabledOverride:
      row.functioncall_pubmed_enabled_override === null
        ? null
        : fromDbBoolean(row.functioncall_pubmed_enabled_override),
    functionCallPubMedExecutionMode: row.functioncall_pubmed_execution_mode,
    functionCallPubMedExecutionModeOverride: row.functioncall_pubmed_execution_mode_override,
    mcpMode: row.mcp_mode,
    mcpEnabledOverride:
      row.mcp_enabled_override === null ? null : fromDbBoolean(row.mcp_enabled_override),
    sortOrder: row.sort_order
  }
}

export function mapMessage(row: MessageRow): NormalChatConversationMessage {
  return {
    id: row.id,
    topicId: row.topic_id,
    requestId: row.request_id,
    role: row.message_role,
    parts: parseJson(row.parts_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
