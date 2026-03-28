import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
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

export interface MessageRow {
  id: string
  topic_id: string
  request_id: string
  message_role: NormalChatConversationMessage['role']
  parts_json: string
  created_at: string
  updated_at: string
}

export interface TurnTraceRow {
  request_id: string
  topic_id: string
  assistant_id: string
  assistant_name: string
  assistant_emoji: string
  topic_title: string
  request_record_json: string | null
  response_record_json: string | null
  runtime_trace_json: string | null
}

export interface WorkspaceStateRow {
  active_assistant_id: string
  active_topic_id: string
}
