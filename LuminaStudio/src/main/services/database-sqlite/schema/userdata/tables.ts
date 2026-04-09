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
      persistence_preset TEXT NOT NULL DEFAULT 'light' CHECK (persistence_preset IN ('light', 'full')),
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

/**
 * request 头表：新的 request 级索引视图。
 *
 * 这里只保留状态、水位、定位信息，不再保存旧 execution_snapshot_json 这种大快照。
 */
export const NORMAL_CHAT_REQUEST_HEADS_TABLE: TableDefinition = {
  name: 'normal_chat_request_heads',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_request_heads (
      request_id TEXT PRIMARY KEY,
      assistant_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      root_agent_run_id TEXT,
      user_message_id TEXT,
      assistant_message_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'aborted', 'deleted')),
      phase TEXT NOT NULL CHECK (phase IN ('queued', 'preparing_context', 'building_prompt', 'awaiting_model', 'executing_actions', 'finished')),
      error_message TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      updated_at TEXT NOT NULL,
      last_entry_seq INTEGER,
      FOREIGN KEY (assistant_id) REFERENCES normal_chat_assistants(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES normal_chat_topics(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES normal_chat_conversations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_request_heads_topic_created
      ON normal_chat_request_heads(topic_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_request_heads_assistant_created
      ON normal_chat_request_heads(assistant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_request_heads_status_created
      ON normal_chat_request_heads(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_request_heads_conversation_created
      ON normal_chat_request_heads(conversation_id, created_at);
  `
}

/**
 * request entry 表：新的 append-only 运行时真相流。
 *
 * projector 以后只靠这张表回放 transcript / detail / agent graph。
 */
export const NORMAL_CHAT_REQUEST_ENTRIES_TABLE: TableDefinition = {
  name: 'normal_chat_request_entries',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_request_entries (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      assistant_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      entity_kind TEXT NOT NULL CHECK (entity_kind IN ('request', 'message', 'model_call', 'action_run', 'agent_run')),
      entity_id TEXT NOT NULL,
      parent_entity_id TEXT,
      op TEXT NOT NULL CHECK (op IN ('created', 'patched', 'delta', 'status', 'finished', 'failed', 'deleted')),
      visibility TEXT NOT NULL CHECK (visibility IN ('transcript', 'debug', 'agent', 'internal')),
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES normal_chat_request_heads(request_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_request_entries_request_seq
      ON normal_chat_request_entries(request_id, seq);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_request_entries_topic_seq
      ON normal_chat_request_entries(topic_id, seq);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_request_entries_assistant_seq
      ON normal_chat_request_entries(assistant_id, seq);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_request_entries_entity_seq
      ON normal_chat_request_entries(entity_kind, entity_id, seq);
    CREATE INDEX IF NOT EXISTS idx_normal_chat_request_entries_visibility_request_seq
      ON normal_chat_request_entries(visibility, request_id, seq);
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
  NORMAL_CHAT_REQUEST_HEADS_TABLE,
  NORMAL_CHAT_REQUEST_ENTRIES_TABLE,
  NORMAL_CHAT_WORKSPACE_STATE_TABLE
]
