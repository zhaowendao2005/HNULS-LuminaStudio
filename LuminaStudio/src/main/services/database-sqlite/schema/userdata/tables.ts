import type { TableDefinition } from '../../types'

/**
 * Userdata 数据库表结构定义
 *
 * 当前仅保留 Normal Chat 业务真正需要的持久化结构：
 * - 助手
 * - 话题
 * - 消息
 * - 完整会话审计
 * - 当前工作区 active 状态
 */

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

export const NORMAL_CHAT_ASSISTANTS_TABLE: TableDefinition = {
  name: 'normal_chat_assistants',
  createSQL: `
    CREATE TABLE IF NOT EXISTS normal_chat_assistants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      label_id TEXT,
      default_system_prompt TEXT NOT NULL DEFAULT '',
      save_full_conversation_enabled INTEGER NOT NULL DEFAULT 0,
      streaming_enabled INTEGER NOT NULL DEFAULT 1,
      call_mode TEXT NOT NULL DEFAULT 'auto',
      cost_mode TEXT NOT NULL DEFAULT 'per_token',
      max_recursion_depth INTEGER NOT NULL DEFAULT 2,
      max_retries_per_agent INTEGER NOT NULL DEFAULT 1,
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
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (assistant_id) REFERENCES normal_chat_assistants(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_topics_assistant_sort
      ON normal_chat_topics(assistant_id, sort_order, created_at);
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
      save_full_conversation_enabled INTEGER NOT NULL DEFAULT 0,
      request_record_json TEXT NOT NULL,
      response_record_json TEXT NOT NULL,
      runtime_trace_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES normal_chat_topics(id) ON DELETE CASCADE
    );
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
  NORMAL_CHAT_MESSAGES_TABLE,
  NORMAL_CHAT_TURN_TRACES_TABLE,
  NORMAL_CHAT_WORKSPACE_STATE_TABLE
]
