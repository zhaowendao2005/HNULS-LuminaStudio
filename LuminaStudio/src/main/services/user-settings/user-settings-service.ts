import type Database from 'better-sqlite3'
import { logger } from '../logger'
import type { DatabaseManager } from '../database-sqlite'

const log = logger.scope('UserSettingsService')
const CURRENT_SETTINGS_VERSION = 2

/**
 * 单条 API Key 注册项。
 */
export interface ApiKeyEntry {
  id: string
  provider_id: string
  label: string
  api_key: string
  enabled: boolean
  created_at: string
  updated_at: string
}

/**
 * API Keys 配置。
 */
export interface ApiKeysConfig {
  entries: ApiKeyEntry[]
}

/**
 * MCP Chat 全局设置。
 */
export interface McpChatSettings {
  /**
   * 新建 MCP 会话时默认保留多少轮上下文。
   */
  memoryRoundsDefault: number
  /**
   * 是否启用多轮 agent 模式。
   */
  enableAgentMode: boolean
  /**
   * 多轮 agent 模式下最多自主规划多少轮。
   */
  agentMaxRounds: number
}

/**
 * 用户设置数据结构
 */
export interface UserSettings {
  version: number
  updatedAt: string
  apiKeys: ApiKeysConfig
  mcpChat: McpChatSettings
}

/**
 * 默认配置
 */
const DEFAULT_USER_SETTINGS: UserSettings = {
  version: CURRENT_SETTINGS_VERSION,
  updatedAt: new Date().toISOString(),
  apiKeys: {
    entries: []
  },
  mcpChat: {
    memoryRoundsDefault: 10,
    enableAgentMode: false,
    agentMaxRounds: 3
  }
}

/**
 * 生成一条标准化 entry。
 *
 * 这里统一补齐 id、时间、label 等字段，避免 renderer / main 各自拼装出不同结构。
 */
function createNormalizedApiKeyEntry(
  partial: Partial<ApiKeyEntry> & Pick<ApiKeyEntry, 'provider_id'>,
  fallbackTimestamp: string
): ApiKeyEntry {
  const trimmedProviderId = partial.provider_id.trim()
  const createdAt = partial.created_at || fallbackTimestamp
  const updatedAt = partial.updated_at || fallbackTimestamp
  const label = partial.label?.trim() || `${trimmedProviderId.toUpperCase()} 默认密钥`

  return {
    id: partial.id?.trim() || `apikey_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    provider_id: trimmedProviderId,
    label,
    api_key: partial.api_key?.trim() || '',
    enabled: partial.enabled ?? true,
    created_at: createdAt,
    updated_at: updatedAt
  }
}

/**
 * 标准化 registry 配置。
 *
 * - 过滤 provider_id 为空的脏数据
 * - 过滤 api_key 为空的空壳条目
 * - 保留已有 id 与时间，便于后续节点引用稳定
 */
function normalizeApiKeysConfig(input: unknown, fallbackTimestamp: string): ApiKeysConfig {
  if (!input || typeof input !== 'object') {
    return { entries: [] }
  }

  const candidateEntries = (input as { entries?: unknown[] }).entries
  if (!Array.isArray(candidateEntries)) {
    return { entries: [] }
  }

  const entries = candidateEntries
    .filter((entry): entry is Partial<ApiKeyEntry> & { provider_id: string } => {
      return Boolean(
        entry &&
        typeof entry === 'object' &&
        typeof (entry as { provider_id?: unknown }).provider_id === 'string'
      )
    })
    .map((entry) => createNormalizedApiKeyEntry(entry, fallbackTimestamp))
    .filter((entry) => entry.provider_id && entry.api_key)

  return { entries }
}

/**
 * UserSettingsService
 *
 * 负责用户设置的业务逻辑：
 * - 从 BaseConfig 数据库读取/写入配置
 * - 数据存储在 BaseConfig.app_settings 表
 */
export class UserSettingsService {
  private db: Database.Database
  private settings: UserSettings | null = null
  private static readonly SETTINGS_KEY = 'userSettings'

  constructor(databaseManager: DatabaseManager) {
    this.db = databaseManager.getDatabase('BaseConfig')
  }

  /**
   * 初始化服务
   */
  initialize(): void {
    try {
      this.loadSettings()
      log.info('User settings service initialized')
    } catch (error) {
      log.error('Failed to initialize user settings service', error)
      throw error
    }
  }

  /**
   * 加载设置
   */
  private loadSettings(): void {
    try {
      const row = this.db
        .prepare('SELECT value FROM app_settings WHERE key = ?')
        .get(UserSettingsService.SETTINGS_KEY) as { value: string } | undefined

      if (!row?.value) {
        this.settings = structuredClone(DEFAULT_USER_SETTINGS)
        this.saveSettings()
        log.info('User settings initialized in BaseConfig', {
          key: UserSettingsService.SETTINGS_KEY
        })
        return
      }

      const parsed = JSON.parse(row.value) as Partial<UserSettings>
      const fallbackTimestamp = parsed.updatedAt || new Date().toISOString()
      this.settings = {
        ...DEFAULT_USER_SETTINGS,
        ...parsed,
        version: CURRENT_SETTINGS_VERSION,
        updatedAt: fallbackTimestamp,
        apiKeys: normalizeApiKeysConfig(parsed.apiKeys, fallbackTimestamp),
        mcpChat: {
          ...DEFAULT_USER_SETTINGS.mcpChat,
          ...(parsed.mcpChat || {})
        }
      }

      log.info('Settings loaded successfully', {
        version: this.settings.version,
        entries: this.settings.apiKeys.entries.length
      })
    } catch (error) {
      log.error('Failed to load settings from BaseConfig, using default', error)
      this.settings = structuredClone(DEFAULT_USER_SETTINGS)
      this.saveSettings()
    }
  }

  /**
   * 保存设置
   */
  private saveSettings(): void {
    try {
      if (!this.settings) {
        throw new Error('Settings not initialized')
      }

      this.settings.updatedAt = new Date().toISOString()
      const data = JSON.stringify(this.settings, null, 2)
      this.db
        .prepare(
          'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))'
        )
        .run(UserSettingsService.SETTINGS_KEY, data)
      log.debug('Settings saved', { key: UserSettingsService.SETTINGS_KEY })
    } catch (error) {
      log.error('Failed to save settings', error)
      throw error
    }
  }

  /**
   * 获取当前设置
   */
  async getSettings(): Promise<UserSettings> {
    if (!this.settings) {
      throw new Error('Settings not initialized')
    }
    return structuredClone(this.settings)
  }

  /**
   * 更新设置（部分更新）
   */
  async updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
    try {
      if (!this.settings) {
        throw new Error('Settings not initialized')
      }

      log.debug('Updating settings', { patchKeys: Object.keys(patch) })

      if (patch.apiKeys) {
        // API Key registry 使用整包标准化替换，
        // 这样能避免按索引合并时把旧 entry 残留在本地。
        this.settings.apiKeys = normalizeApiKeysConfig(
          patch.apiKeys,
          this.settings.updatedAt || new Date().toISOString()
        )
      }

      // MCP Chat 配置仍然使用部分合并，避免覆盖未来扩展字段。
      if (patch.mcpChat) {
        this.settings.mcpChat = {
          ...this.settings.mcpChat,
          ...patch.mcpChat
        }
      }

      this.settings.version = CURRENT_SETTINGS_VERSION
      this.saveSettings()
      log.info('Settings updated successfully', {
        version: this.settings.version,
        entries: this.settings.apiKeys.entries.length
      })

      return this.getSettings()
    } catch (error) {
      log.error('Failed to update settings', error)
      throw error
    }
  }

  /**
   * 获取 API Keys
   */
  async getApiKeys(): Promise<ApiKeysConfig> {
    const settings = await this.getSettings()
    return settings.apiKeys
  }

  /**
   * 更新 API Keys
   */
  async updateApiKeys(keys: Partial<ApiKeysConfig>): Promise<ApiKeysConfig> {
    await this.updateSettings({ apiKeys: keys })
    return this.getApiKeys()
  }
}
