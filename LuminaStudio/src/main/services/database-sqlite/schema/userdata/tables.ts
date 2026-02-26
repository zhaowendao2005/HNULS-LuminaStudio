import type { TableDefinition } from '../../types'

/**
 * Userdata 数据库表结构定义
 *
 * 包含：
 * - _schema_version: 版本元数据表
 * - conversations: 对话表
 * - messages: 消息表
 * - message_usage: 消息 token 使用统计表
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

export const PRESETS_TABLE: TableDefinition = {
  name: 'presets',
  createSQL: `
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `
}

export const CONVERSATIONS_TABLE: TableDefinition = {
  name: 'conversations',
  createSQL: `
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      preset_id TEXT NOT NULL,
      title TEXT,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      enable_thinking INTEGER NOT NULL DEFAULT 0,
      memory_rounds INTEGER NOT NULL DEFAULT 10,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (preset_id) REFERENCES presets(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_preset_time 
      ON conversations(preset_id, updated_at);
  `
}

export const MESSAGES_TABLE: TableDefinition = {
  name: 'messages',
  createSQL: `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      text TEXT,
      reasoning TEXT,
      content_json TEXT,
      status TEXT DEFAULT 'final',
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_time 
      ON messages(conversation_id, created_at);
  `
}

export const MESSAGE_USAGE_TABLE: TableDefinition = {
  name: 'message_usage',
  createSQL: `
    CREATE TABLE IF NOT EXISTS message_usage (
      message_id TEXT PRIMARY KEY,
      input_tokens INTEGER,
      output_tokens INTEGER,
      reasoning_tokens INTEGER,
      total_tokens INTEGER,
      provider_metadata_json TEXT,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
  `
}

export const USERDATA_TABLES: TableDefinition[] = [
  SCHEMA_VERSION_TABLE,
  PRESETS_TABLE,
  CONVERSATIONS_TABLE,
  MESSAGES_TABLE,
  MESSAGE_USAGE_TABLE
]
