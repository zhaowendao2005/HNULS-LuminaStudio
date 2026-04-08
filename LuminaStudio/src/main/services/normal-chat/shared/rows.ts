import type {
  NormalChatAssistant,
  NormalChatFunctionCallMode,
  NormalChatTopic
} from '@preload/types'

export interface AssistantRow {
  id: string
  name: string
  emoji: string
  label_id: string | null
  default_system_prompt: string
  streaming_enabled: number
  call_mode: NormalChatAssistant['callMode']
  cost_mode: NormalChatAssistant['costMode']
  default_model_provider_id: string | null
  default_model_id: string | null
  context_memory_rounds: number
  max_recursion_depth: number
  max_reasoning_steps: number
  system_action_functioncall_enabled: number
  system_action_subagent_enabled: number
  functioncall_pubmed_enabled: number
  functioncall_pubmed_mode: NormalChatFunctionCallMode
  mcp_enabled: number
  persistence_preset: NormalChatAssistant['persistencePreset']
  sort_order: number
}

export interface TopicRow {
  id: string
  assistant_id: string
  title: string
  system_prompt_mode: 'inherit' | 'override'
  system_prompt_override: string | null
  streaming_mode: 'inherit' | 'override'
  streaming_enabled_override: number | null
  cost_mode: 'inherit' | 'override'
  cost_mode_override: NormalChatTopic['costModeOverride']
  model_mode: 'inherit' | 'override'
  model_provider_id_override: string | null
  model_id_override: string | null
  context_memory_rounds_mode: 'inherit' | 'override'
  context_memory_rounds_override: number | null
  max_recursion_depth_mode: 'inherit' | 'override'
  max_recursion_depth_override: number | null
  max_reasoning_steps_mode: 'inherit' | 'override'
  max_reasoning_steps_override: number | null
  system_action_functioncall_mode: 'inherit' | 'override'
  system_action_functioncall_enabled_override: number | null
  system_action_subagent_mode: 'inherit' | 'override'
  system_action_subagent_enabled_override: number | null
  functioncall_pubmed_mode: 'inherit' | 'override'
  functioncall_pubmed_enabled_override: number | null
  functioncall_pubmed_execution_mode: 'inherit' | 'override'
  functioncall_pubmed_execution_mode_override: NormalChatFunctionCallMode | null
  mcp_mode: 'inherit' | 'override'
  mcp_enabled_override: number | null
  sort_order: number
}

export interface LabelRow {
  id: string
  name: string
  sort_order: number
}

export interface ConversationRow {
  id: string
  topic_id: string
  title: string
  agent_template_id: string
  program_prompt_injections_json: string
  created_at: string
  updated_at: string
}

/**
 * request 头表行。
 *
 * 这个表只承担“检索与当前状态”的职责，不保存大块 prompt/debug JSON。
 */
export interface RequestHeadRow {
  request_id: string
  assistant_id: string
  topic_id: string
  conversation_id: string
  root_agent_run_id: string | null
  user_message_id: string | null
  assistant_message_id: string | null
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted' | 'deleted'
  phase:
    | 'queued'
    | 'preparing_context'
    | 'building_prompt'
    | 'awaiting_model'
    | 'executing_actions'
    | 'committing_message'
    | 'finished'
  error_message: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  updated_at: string
  last_entry_seq: number | null
}

/**
 * request entry 行。
 *
 * 真正的运行时事实统一沉淀在这里，projector 需要靠它回放 transcript / detail / agent graph。
 */
export interface RequestEntryRow {
  seq: number
  request_id: string
  assistant_id: string
  topic_id: string
  conversation_id: string
  entity_kind: 'request' | 'message' | 'model_call' | 'action_run' | 'agent_run'
  entity_id: string
  parent_entity_id: string | null
  op: 'created' | 'patched' | 'delta' | 'status' | 'finished' | 'failed' | 'deleted'
  visibility: 'transcript' | 'debug' | 'agent' | 'internal'
  payload_json: string
  created_at: string
}

export interface WorkspaceStateRow {
  active_assistant_id: string
  active_topic_id: string
}
