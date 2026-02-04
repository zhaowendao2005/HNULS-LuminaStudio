import type { TableDefinition } from '../../types'

/**
 * BaseConfig 数据库表结构定义
 * 
 * 包含：
 * - _schema_version: 版本元数据表
 * - model_providers: 模型提供商表
 * - model_configs: 模型配置表
 * - app_settings: 应用设置表
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

export const MODEL_PROVIDERS_TABLE: TableDefinition = {
  name: 'model_providers',
  createSQL: `
    CREATE TABLE IF NOT EXISTS model_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      protocol TEXT NOT NULL DEFAULT 'openai',
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
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      group_name TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
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
