import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { logger } from '../logger'

const log = logger.scope('UserSettingsService')

/**
 * API Keys 配置
 */
export interface ApiKeysConfig {
  pubmed?: string
  // 可扩展其他 API keys
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
  version: 1,
  updatedAt: new Date().toISOString(),
  apiKeys: {},
  mcpChat: {
    memoryRoundsDefault: 10,
    enableAgentMode: false,
    agentMaxRounds: 3
  }
}

/**
 * UserSettingsService
 *
 * 负责用户设置的业务逻辑：
 * - 从 JSON 文件读取/写入配置
 * - 数据存储在 {userData}/databases/user.json
 */
export class UserSettingsService {
  private settingsPath: string
  private settings: UserSettings | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    const dataDir = path.join(userDataPath, 'databases')
    this.settingsPath = path.join(dataDir, 'user.json')

    // 确保 databases 目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
      log.info('Databases directory created', { path: dataDir })
    }
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
      if (!fs.existsSync(this.settingsPath)) {
        log.info('Settings file not found, creating default', { path: this.settingsPath })
        this.settings = DEFAULT_USER_SETTINGS
        this.saveSettings()
        return
      }

      const data = fs.readFileSync(this.settingsPath, 'utf-8')
      const parsed = JSON.parse(data) as Partial<UserSettings>
      this.settings = {
        ...DEFAULT_USER_SETTINGS,
        ...parsed,
        apiKeys: {
          ...DEFAULT_USER_SETTINGS.apiKeys,
          ...(parsed.apiKeys || {})
        },
        mcpChat: {
          ...DEFAULT_USER_SETTINGS.mcpChat,
          ...(parsed.mcpChat || {})
        }
      }

      // 版本校验（如果需要迁移逻辑，可在此处理）
      if (this.settings.version !== DEFAULT_USER_SETTINGS.version) {
        log.warn(
          `Settings version mismatch: expected ${DEFAULT_USER_SETTINGS.version}, got ${this.settings.version}`
        )
        // TODO: 版本迁移逻辑
      }

      log.info('Settings loaded successfully', { version: this.settings.version })
    } catch (error) {
      log.error('Failed to load settings, using default', error)
      this.settings = DEFAULT_USER_SETTINGS
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
      fs.writeFileSync(this.settingsPath, data, 'utf-8')
      log.debug('Settings saved', { path: this.settingsPath })
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
    return { ...this.settings }
  }

  /**
   * 更新设置（部分更新）
   */
  async updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
    try {
      if (!this.settings) {
        throw new Error('Settings not initialized')
      }

      log.debug('Updating settings', { patch })

      // 深度合并 apiKeys
      if (patch.apiKeys) {
        this.settings.apiKeys = {
          ...this.settings.apiKeys,
          ...patch.apiKeys
        }
      }

      // MCP Chat 配置也采用部分合并，避免未来继续扩展时覆盖其他字段。
      if (patch.mcpChat) {
        this.settings.mcpChat = {
          ...this.settings.mcpChat,
          ...patch.mcpChat
        }
      }

      this.saveSettings()
      log.info('Settings updated successfully')

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
