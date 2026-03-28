import type { TableDefinition } from '../../types'

export const SCHEMA_VERSION_TABLE: TableDefinition = {
  name: '_schema_version',
  createSQL: `
    CREATE TABLE IF NOT EXISTS _schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `
}

export const NORMAL_CHAT_LABELS_TABLE: TableDefinition = {
  name: 'normal_chat_labels',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_labels_sort
      ON normal_chat_labels(sort_order, created_at);
  `
}

export const NORMAL_CHAT_ASSISTANTS_TABLE: TableDefinition = {
  name: 'normal_chat_assistants',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_assistants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      label_id TEXT,
      default_system_prompt TEXT NOT NULL DEFAULT '',
      streaming_enabled INTEGER NOT NULL DEFAULT 1,
      call_mode TEXT NOT NULL DEFAULT 'auto' CHECK (call_mode IN ('fast', 'slow', 'auto')),
      cost_mode TEXT NOT NULL DEFAULT 'per_token' CHECK (cost_mode IN ('per_call', 'per_token')),
      default_model_provider_id TEXT,
      default_model_id TEXT,
      context_memory_rounds INTEGER NOT NULL DEFAULT 12,
      max_recursion_depth INTEGER NOT NULL DEFAULT 2,
      max_reasoning_steps INTEGER NOT NULL DEFAULT 6,
      system_action_functioncall_enabled INTEGER NOT NULL DEFAULT 1,
      system_action_subagent_enabled INTEGER NOT NULL DEFAULT 1,
      functioncall_pubmed_enabled INTEGER NOT NULL DEFAULT 1,
      functioncall_pubmed_mode TEXT NOT NULL DEFAULT 'fast' CHECK (functioncall_pubmed_mode IN ('fast', 'slow')),
      mcp_enabled INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (label_id) REFERENCES normal_chat_labels(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_assistants_sort
      ON normal_chat_assistants(sort_order, created_at);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_assistants_label
      ON normal_chat_assistants(label_id, sort_order, created_at);
  `
}

export const NORMAL_CHAT_TOPICS_TABLE: TableDefinition = {
  name: 'normal_chat_topics',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_topics (
      id TEXT PRIMARY KEY,
      assistant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      system_prompt_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (system_prompt_mode IN ('inherit', 'override')),
      system_prompt_override TEXT,
      streaming_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (streaming_mode IN ('inherit', 'override')),
      streaming_enabled_override INTEGER,
      cost_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (cost_mode IN ('inherit', 'override')),
      cost_mode_override TEXT CHECK (cost_mode_override IN ('per_call', 'per_token')),
      model_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (model_mode IN ('inherit', 'override')),
      model_provider_id_override TEXT,
      model_id_override TEXT,
      context_memory_rounds_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (context_memory_rounds_mode IN ('inherit', 'override')),
      context_memory_rounds_override INTEGER,
      max_recursion_depth_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (max_recursion_depth_mode IN ('inherit', 'override')),
      max_recursion_depth_override INTEGER,
      max_reasoning_steps_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (max_reasoning_steps_mode IN ('inherit', 'override')),
      max_reasoning_steps_override INTEGER,
      system_action_functioncall_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (system_action_functioncall_mode IN ('inherit', 'override')),
      system_action_functioncall_enabled_override INTEGER,
      system_action_subagent_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (system_action_subagent_mode IN ('inherit', 'override')),
      system_action_subagent_enabled_override INTEGER,
      functioncall_pubmed_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (functioncall_pubmed_mode IN ('inherit', 'override')),
      functioncall_pubmed_enabled_override INTEGER,
      functioncall_pubmed_execution_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (functioncall_pubmed_execution_mode IN ('inherit', 'override')),
      functioncall_pubmed_execution_mode_override TEXT CHECK (functioncall_pubmed_execution_mode_override IN ('fast', 'slow')),
      mcp_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (mcp_mode IN ('inherit', 'override')),
      mcp_enabled_override INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (assistant_id) REFERENCES normal_chat_assistants(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_topics_assistant_sort
      ON normal_chat_topics(assistant_id, sort_order, created_at);
  `
}

export const NORMAL_CHAT_ASSISTANT_ACTION_POLICIES_TABLE: TableDefinition = {
  name: 'normal_chat_assistant_action_policies',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_assistant_action_policies (
      assistant_id TEXT NOT NULL,
      action_key TEXT NOT NULL,
      action_kind TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      mode TEXT NOT NULL DEFAULT 'fast' CHECK (mode IN ('fast', 'slow')),
      config_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (assistant_id, action_key),
      FOREIGN KEY (assistant_id) REFERENCES normal_chat_assistants(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_assistant_action_policies_sort
      ON normal_chat_assistant_action_policies(assistant_id, action_kind, sort_order, action_key);
  `
}

export const NORMAL_CHAT_TOPIC_ACTION_OVERRIDES_TABLE: TableDefinition = {
  name: 'normal_chat_topic_action_overrides',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_topic_action_overrides (
      topic_id TEXT NOT NULL,
      action_key TEXT NOT NULL,
      mode_kind TEXT NOT NULL DEFAULT 'inherit' CHECK (mode_kind IN ('inherit', 'override')),
      enabled_override INTEGER,
      mode_override TEXT CHECK (mode_override IN ('fast', 'slow')),
      config_override_json TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (topic_id, action_key),
      FOREIGN KEY (topic_id) REFERENCES normal_chat_topics(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_topic_action_overrides_sort
      ON normal_chat_topic_action_overrides(topic_id, sort_order, action_key);
  `
}

export const NORMAL_CHAT_CONVERSATIONS_TABLE: TableDefinition = {
  name: 'normal_chat_conversations',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_conversations (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Default Conversation',
      agent_template_id TEXT NOT NULL DEFAULT 'main-agent-v1',
      program_prompt_injections_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES normal_chat_topics(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_conversations_topic_created
      ON normal_chat_conversations(topic_id, created_at);
  `
}

export const NORMAL_CHAT_MESSAGES_TABLE: TableDefinition = {
  name: 'normal_chat_messages',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_messages (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant')),
      parts_json TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES normal_chat_topics(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_messages_topic_sort
      ON normal_chat_messages(topic_id, sort_order, created_at);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_messages_request
      ON normal_chat_messages(request_id, created_at);
  `
}

export const NORMAL_CHAT_TURN_TRACES_TABLE: TableDefinition = {
  name: 'normal_chat_turn_traces',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_turn_traces (
      request_id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      assistant_id TEXT NOT NULL,
      assistant_name TEXT NOT NULL,
      assistant_emoji TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      request_record_json TEXT,
      response_record_json TEXT,
      runtime_trace_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES normal_chat_topics(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_turn_traces_topic
      ON normal_chat_turn_traces(topic_id, created_at);
  `
}

export const NORMAL_CHAT_TASKS_TABLE: TableDefinition = {
  name: 'normal_chat_tasks',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_tasks (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      conversation_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      assistant_id TEXT NOT NULL,
      user_message_id TEXT NOT NULL,
      assistant_message_id TEXT,
      root_agent_run_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'aborted')),
      model_provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      finished_at TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES normal_chat_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES normal_chat_topics(id) ON DELETE CASCADE,
      FOREIGN KEY (assistant_id) REFERENCES normal_chat_assistants(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_tasks_status_created
      ON normal_chat_tasks(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_tasks_topic_created
      ON normal_chat_tasks(topic_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_tasks_conversation_created
      ON normal_chat_tasks(conversation_id, created_at);
  `
}

export const NORMAL_CHAT_TASK_SNAPSHOTS_TABLE: TableDefinition = {
  name: 'normal_chat_task_snapshots',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_task_snapshots (
      task_id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      conversation_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      assistant_id TEXT NOT NULL,
      agent_template_id TEXT NOT NULL,
      user_input TEXT NOT NULL,
      resolved_config_json TEXT NOT NULL,
      history_messages_json TEXT NOT NULL,
      prompt_injections_json TEXT NOT NULL,
      request_payload_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES normal_chat_tasks(id) ON DELETE CASCADE
    );
  `
}

export const NORMAL_CHAT_AGENT_RUNS_TABLE: TableDefinition = {
  name: 'normal_chat_agent_runs',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_agent_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      parent_agent_run_id TEXT,
      depth INTEGER NOT NULL DEFAULT 0,
      role_kind TEXT NOT NULL,
      template_id TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'aborted')),
      react_count INTEGER NOT NULL DEFAULT 0,
      max_react_steps INTEGER NOT NULL DEFAULT 0,
      max_child_depth INTEGER NOT NULL DEFAULT 0,
      model_provider_id TEXT,
      model_id TEXT,
      final_text TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      finished_at TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES normal_chat_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_agent_run_id) REFERENCES normal_chat_agent_runs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_agent_runs_task_depth
      ON normal_chat_agent_runs(task_id, depth, created_at);
  `
}

export const NORMAL_CHAT_ACTION_RUNS_TABLE: TableDefinition = {
  name: 'normal_chat_action_runs',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_action_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_run_id TEXT NOT NULL,
      action_key TEXT NOT NULL,
      action_kind TEXT NOT NULL,
      mode TEXT,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'error', 'aborted')),
      round_index INTEGER NOT NULL DEFAULT 0,
      batch_index INTEGER NOT NULL DEFAULT 0,
      parallel_index INTEGER NOT NULL DEFAULT 0,
      input_json TEXT NOT NULL,
      output_json TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      finished_at TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES normal_chat_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_run_id) REFERENCES normal_chat_agent_runs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_action_runs_task_round
      ON normal_chat_action_runs(task_id, round_index, batch_index, parallel_index, created_at);
  `
}

export const NORMAL_CHAT_MODEL_CALLS_TABLE: TableDefinition = {
  name: 'normal_chat_model_calls',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_model_calls (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      task_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      agent_run_id TEXT NOT NULL,
      parent_action_run_id TEXT,
      depth INTEGER NOT NULL,
      round_index INTEGER NOT NULL,
      call_index_in_agent INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'aborted')),
      request_payload_json TEXT NOT NULL,
      compiled_prompt_json TEXT NOT NULL,
      compiled_prompt_markdown TEXT NOT NULL,
      history_messages_json TEXT NOT NULL,
      loaded_actions_json TEXT NOT NULL,
      action_results_json TEXT NOT NULL,
      response_stream_text TEXT,
      response_envelope_json TEXT,
      final_reply_md TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      finished_at TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES normal_chat_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_run_id) REFERENCES normal_chat_agent_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_action_run_id) REFERENCES normal_chat_action_runs(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_model_calls_task_seq
      ON normal_chat_model_calls(task_id, seq);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_model_calls_agent_round
      ON normal_chat_model_calls(agent_run_id, round_index, call_index_in_agent, created_at);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_model_calls_request_seq
      ON normal_chat_model_calls(request_id, seq);
  `
}

export const NORMAL_CHAT_RUNTIME_EVENTS_TABLE: TableDefinition = {
  name: 'normal_chat_runtime_events',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_runtime_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES normal_chat_tasks(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_runtime_events_task_seq
      ON normal_chat_runtime_events(task_id, seq);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_runtime_events_request_seq
      ON normal_chat_runtime_events(request_id, seq);
  `
}

export const NORMAL_CHAT_WORKSPACE_STATE_TABLE: TableDefinition = {
  name: 'normal_chat_workspace_state',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_workspace_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      active_assistant_id TEXT NOT NULL,
      active_topic_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `
}

export const USERDATA_TABLES: TableDefinition[] = [
  SCHEMA_VERSION_TABLE,
  NORMAL_CHAT_LABELS_TABLE,
  NORMAL_CHAT_ASSISTANTS_TABLE,
  NORMAL_CHAT_TOPICS_TABLE,
  NORMAL_CHAT_ASSISTANT_ACTION_POLICIES_TABLE,
  NORMAL_CHAT_TOPIC_ACTION_OVERRIDES_TABLE,
  NORMAL_CHAT_CONVERSATIONS_TABLE,
  NORMAL_CHAT_MESSAGES_TABLE,
  NORMAL_CHAT_TURN_TRACES_TABLE,
  NORMAL_CHAT_TASKS_TABLE,
  NORMAL_CHAT_TASK_SNAPSHOTS_TABLE,
  NORMAL_CHAT_AGENT_RUNS_TABLE,
  NORMAL_CHAT_ACTION_RUNS_TABLE,
  NORMAL_CHAT_MODEL_CALLS_TABLE,
  NORMAL_CHAT_RUNTIME_EVENTS_TABLE,
  NORMAL_CHAT_WORKSPACE_STATE_TABLE
]
