/**
 * 单条 API Key 注册项。
 *
 * 这里使用 registry 结构，而不是旧的 apiKeys.pubmed 单字段，
 * 方便后续一个 provider 维护多条 key，并支持节点只保存引用 id。
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
