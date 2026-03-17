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
   * 新建 MCP 对话时默认保留多少轮上下文。
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
