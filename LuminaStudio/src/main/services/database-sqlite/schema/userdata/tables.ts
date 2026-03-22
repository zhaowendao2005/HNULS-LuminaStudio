import type { TableDefinition } from '../../types'

/**
 * Userdata 数据库表结构定义
 *
 * 当前仅保留 Normal Chat 第一批业务真正需要的持久化结构：
 * - 助手
 * - 话题
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
      template_key TEXT NOT NULL,
      emoji TEXT NOT NULL,
      label_id TEXT,
      default_system_prompt TEXT NOT NULL DEFAULT '',
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
      message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant')),
      parts_json TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES normal_chat_topics(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_normal_chat_messages_topic_sort
      ON normal_chat_messages(topic_id, sort_order, created_at);
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
  NORMAL_CHAT_WORKSPACE_STATE_TABLE
]
