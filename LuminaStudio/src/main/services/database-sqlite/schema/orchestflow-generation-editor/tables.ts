import type { TableDefinition } from '../../types'

/**
 * orchestflow-generation-editor 数据库表结构。
 *
 * 这套库只服务于 GenerateView：
 * - generation_sessions: 会话元信息
 * - generation_stage_configs: 三阶段配置（模型 / 记忆数 / Auto Approved）
 * - generation_documents: 三阶段文档正文
 * - generation_messages: 4 条 AI 对话通道的消息历史
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

export const GENERATION_SESSIONS_TABLE: TableDefinition = {
  name: 'generation_sessions',
  createSQL: `
    CREATE TABLE IF NOT EXISTS generation_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      current_stage TEXT NOT NULL DEFAULT 'analysis',
      summary TEXT NOT NULL DEFAULT '',
      analysis_turn_count INTEGER NOT NULL DEFAULT 0,
      plan_generated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_generation_sessions_updated_at
      ON generation_sessions(updated_at DESC);
  `
}

export const GENERATION_STAGE_CONFIGS_TABLE: TableDefinition = {
  name: 'generation_stage_configs',
  createSQL: `
    CREATE TABLE IF NOT EXISTS generation_stage_configs (
      session_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      provider_id TEXT,
      model_id TEXT,
      sdk_vendor TEXT,
      memory_rounds INTEGER NOT NULL DEFAULT 6,
      copilot_memory_rounds INTEGER NOT NULL DEFAULT 5,
      auto_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (session_id, stage_key),
      FOREIGN KEY (session_id) REFERENCES generation_sessions(id) ON DELETE CASCADE
    );
  `
}

export const GENERATION_DOCUMENTS_TABLE: TableDefinition = {
  name: 'generation_documents',
  createSQL: `
    CREATE TABLE IF NOT EXISTS generation_documents (
      session_id TEXT NOT NULL,
      document_key TEXT NOT NULL,
      title TEXT NOT NULL,
      file_name TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (session_id, document_key),
      FOREIGN KEY (session_id) REFERENCES generation_sessions(id) ON DELETE CASCADE
    );
  `
}

export const GENERATION_MESSAGES_TABLE: TableDefinition = {
  name: 'generation_messages',
  createSQL: `
    CREATE TABLE IF NOT EXISTS generation_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      channel_key TEXT NOT NULL,
      request_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'final',
      provider_id TEXT,
      model_id TEXT,
      error TEXT,
      usage_json TEXT,
      meta_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES generation_sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_generation_messages_session_channel_created_at
      ON generation_messages(session_id, channel_key, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_generation_messages_request_id
      ON generation_messages(request_id);
  `
}

export const ORCHESTFLOW_GENERATION_EDITOR_TABLES: TableDefinition[] = [
  SCHEMA_VERSION_TABLE,
  GENERATION_SESSIONS_TABLE,
  GENERATION_STAGE_CONFIGS_TABLE,
  GENERATION_DOCUMENTS_TABLE,
  GENERATION_MESSAGES_TABLE
]
