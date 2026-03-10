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

export const MODEL_PROVIDERS_TABLE: TableDefinition = {
  name: 'model_providers',
  createSQL: `
    CREATE TABLE IF NOT EXISTS model_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      protocol TEXT NOT NULL DEFAULT 'openai',
      api_mode TEXT NOT NULL DEFAULT 'auto',
      enabled INTEGER NOT NULL DEFAULT 1,
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      default_headers TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `
}

export const MODEL_CONFIGS_TABLE: TableDefinition = {
  name: 'model_configs',
  createSQL: `
    CREATE TABLE IF NOT EXISTS model_configs (
      provider_id TEXT NOT NULL,
      id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      group_name TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (provider_id, id),
      FOREIGN KEY (provider_id) REFERENCES model_providers(id) ON DELETE CASCADE
    );
  `
}

export const APP_SETTINGS_TABLE: TableDefinition = {
  name: 'app_settings',
  createSQL: `
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `
}

export const BASE_CONFIG_TABLES: TableDefinition[] = [
  SCHEMA_VERSION_TABLE,
  MODEL_PROVIDERS_TABLE,
  MODEL_CONFIGS_TABLE,
  APP_SETTINGS_TABLE
]
