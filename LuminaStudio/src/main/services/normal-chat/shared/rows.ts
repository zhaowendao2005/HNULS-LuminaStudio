import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatFunctionCallMode,
  NormalChatTaskPhase,
  NormalChatTaskStatus,
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

export interface MessageRow {
  id: string
  topic_id: string
  request_id: string
  message_role: NormalChatConversationMessage['role']
  parts_json: string
  created_at: string
  updated_at: string
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

export interface TaskRow {
  id: string
  request_id: string
  conversation_id: string
  topic_id: string
  assistant_id: string
  user_message_id: string
  assistant_message_id: string | null
  root_agent_run_id: string | null
  status: NormalChatTaskStatus
  phase: NormalChatTaskPhase
  model_provider_id: string
  model_id: string
  execution_snapshot_json: string
  final_response_json: string | null
  last_event_seq: number | null
  error_message: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  updated_at: string
}

export interface ModelCallRow {
  seq: number
  id: string
  task_id: string
  request_id: string
  conversation_id: string
  agent_run_id: string
  parent_action_run_id: string | null
  depth: number
  round_index: number
  call_index_in_agent: number
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted'
  request_payload_json: string
  compiled_prompt_json: string
  compiled_prompt_markdown: string
  history_messages_json: string
  loaded_actions_json: string
  action_results_json: string
  response_stream_text: string | null
  response_envelope_json: string | null
  final_reply_md: string | null
  error_message: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  updated_at: string
}

export interface ActionRunRow {
  id: string
  task_id: string
  agent_run_id: string
  action_key: string
  action_kind: string
  mode: string | null
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted'
  round_index: number
  batch_index: number
  parallel_index: number
  input_json: string
  output_json: string | null
  error_message: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  updated_at: string
}

export interface AgentRunRow {
  id: string
  task_id: string
  parent_agent_run_id: string | null
  depth: number
  role_kind: string
  template_id: string
  goal: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'aborted'
  react_count: number
  max_react_steps: number
  max_child_depth: number
  model_provider_id: string | null
  model_id: string | null
  final_text: string | null
  error_message: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  updated_at: string
}

export interface RuntimeEventRow {
  seq: number
  task_id: string
  request_id: string
  topic_id: string
  event_type: string
  payload_json: string
  created_at: string
}

export interface WorkspaceStateRow {
  active_assistant_id: string
  active_topic_id: string
}
