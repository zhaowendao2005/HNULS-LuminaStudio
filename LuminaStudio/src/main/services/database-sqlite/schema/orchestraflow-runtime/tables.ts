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

export const GENERATION_SESSIONS_TABLE: TableDefinition = {
  name: 'of_generation_sessions',
  createSQL: `
    CREATE TABLE IF NOT EXISTS of_generation_sessions (
      id TEXT PRIMARY KEY,
      workflow_name TEXT NOT NULL,
      description TEXT,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      current_phase TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      compiled_workflow_id TEXT,
      phase_state_json TEXT NOT NULL,
      phase_models_json TEXT NOT NULL,
      agent_configs_json TEXT NOT NULL,
      graph_state_json TEXT NOT NULL,
      preview_json TEXT NOT NULL,
      validation_json TEXT NOT NULL,
      artifacts_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_of_generation_sessions_updated_at
      ON of_generation_sessions(updated_at DESC);
  `
}

export const GENERATION_MESSAGES_TABLE: TableDefinition = {
  name: 'of_generation_messages',
  createSQL: `
    CREATE TABLE IF NOT EXISTS of_generation_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT,
      meta_json TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES of_generation_sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_of_generation_messages_session_id
      ON of_generation_messages(session_id, created_at ASC);
  `
}

export const GENERATION_CHECKPOINTS_TABLE: TableDefinition = {
  name: 'of_generation_checkpoints',
  createSQL: `
    CREATE TABLE IF NOT EXISTS of_generation_checkpoints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      label TEXT NOT NULL,
      op_index INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES of_generation_sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_of_generation_checkpoints_session_id
      ON of_generation_checkpoints(session_id, created_at ASC);
  `
}

export const GENERATION_OPLOG_TABLE: TableDefinition = {
  name: 'of_generation_oplog',
  createSQL: `
    CREATE TABLE IF NOT EXISTS of_generation_oplog (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES of_generation_sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_of_generation_oplog_session_id
      ON of_generation_oplog(session_id, created_at ASC);
  `
}

export const WORKFLOW_INDEX_TABLE: TableDefinition = {
  name: 'of_workflow_index',
  createSQL: `
    CREATE TABLE IF NOT EXISTS of_workflow_index (
      workflow_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      author TEXT NOT NULL,
      status TEXT NOT NULL,
      node_count INTEGER NOT NULL,
      json_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_of_workflow_index_updated_at
      ON of_workflow_index(updated_at DESC);
  `
}

export const ORCHESTRAFLOW_RUNTIME_TABLES: TableDefinition[] = [
  SCHEMA_VERSION_TABLE,
  GENERATION_SESSIONS_TABLE,
  GENERATION_MESSAGES_TABLE,
  GENERATION_CHECKPOINTS_TABLE,
  GENERATION_OPLOG_TABLE,
  WORKFLOW_INDEX_TABLE
]
