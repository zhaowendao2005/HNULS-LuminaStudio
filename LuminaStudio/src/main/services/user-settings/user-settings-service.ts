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
 * 用户设置数据结构
 */
export interface UserSettings {
  version: number
  updatedAt: string
  apiKeys: ApiKeysConfig
}

/**
 * 默认配置
 */
const DEFAULT_USER_SETTINGS: UserSettings = {
  version: 1,
  updatedAt: new Date().toISOString(),
  apiKeys: {}
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
      this.settings = JSON.parse(data) as UserSettings

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
