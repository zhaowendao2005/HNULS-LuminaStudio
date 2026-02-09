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
 * User Settings API 接口
 */
export interface UserSettingsAPI {
  /**
   * 获取用户设置
   */
  getSettings: () => Promise<UserSettings>

  /**
   * 更新用户设置（部分更新）
   */
  updateSettings: (patch: Partial<UserSettings>) => Promise<UserSettings>

  /**
   * 获取 API Keys
   */
  getApiKeys: () => Promise<ApiKeysConfig>

  /**
   * 更新 API Keys
   */
  updateApiKeys: (keys: Partial<ApiKeysConfig>) => Promise<ApiKeysConfig>
}
