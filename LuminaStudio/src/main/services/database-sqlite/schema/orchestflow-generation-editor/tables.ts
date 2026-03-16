import type { TableDefinition } from '../../types'

/**
 * 新版 GenerateView 数据库只保留 analysis / design 两阶段。
 * verify、calibration、legacy DSL 相关数据全部通过 schema 重建清理。
 */
export const SCHEMA_VERSION_TABLE: TableDefinition = {
  name: '_schema_version',
  createSQL: `
    CREATE TABLE IF NOT EXISTS _schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    );
  `
}

export const GENERATION_SESSIONS_TABLE: TableDefinition = {
  name: 'generation_sessions',
  createSQL: `
    CREATE TABLE IF NOT EXISTS generation_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      current_stage TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      selected_design_document_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `
}

export const GENERATION_STAGE_CONFIGS_TABLE: TableDefinition = {
  name: 'generation_stage_configs',
  createSQL: `
    CREATE TABLE IF NOT EXISTS generation_stage_configs (
      session_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      memory_rounds INTEGER NOT NULL,
      max_repair_iterations INTEGER NOT NULL,
      budget_limit_tokens INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (session_id, stage_key),
      FOREIGN KEY (session_id) REFERENCES generation_sessions(id) ON DELETE CASCADE
    );
  `
}

export const GENERATION_ANALYSIS_DOCUMENTS_TABLE: TableDefinition = {
  name: 'generation_analysis_documents',
  createSQL: `
    CREATE TABLE IF NOT EXISTS generation_analysis_documents (
      session_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES generation_sessions(id) ON DELETE CASCADE
    );
  `
}

export const GENERATION_DESIGN_DOCUMENTS_TABLE: TableDefinition = {
  name: 'generation_design_documents',
  createSQL: `
    CREATE TABLE IF NOT EXISTS generation_design_documents (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      content_format TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      validation_json TEXT,
      planning_source_message_id TEXT,
      derived_target_type TEXT,
      derived_target_id TEXT,
      version INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
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
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      content TEXT NOT NULL,
      meta_json TEXT,
      request_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES generation_sessions(id) ON DELETE CASCADE
    );
  `
}

export const GENERATION_GLOBAL_SETTINGS_TABLE: TableDefinition = {
  name: 'generation_global_settings',
  createSQL: `
    CREATE TABLE IF NOT EXISTS generation_global_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      persist_raw_llm_data INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `
}

export const ORCHESTFLOW_GENERATION_EDITOR_TABLES: TableDefinition[] = [
  SCHEMA_VERSION_TABLE,
  GENERATION_SESSIONS_TABLE,
  GENERATION_STAGE_CONFIGS_TABLE,
  GENERATION_ANALYSIS_DOCUMENTS_TABLE,
  GENERATION_DESIGN_DOCUMENTS_TABLE,
  GENERATION_MESSAGES_TABLE,
  GENERATION_GLOBAL_SETTINGS_TABLE
]
