import type { ApiResponse } from './base.types'

/**
 * 单个模型配置（持久化到 SQLite）
 */
export interface PersistedModelConfig {
  /**
   * 模型唯一 ID，例如：
   * - gpt-4o
   * - gemini-3-pro
   * - deepseek/chat
   */
  id: string

  /**
   * 展示名称，通常用于前端下拉选项显示。
   * 默认为 id，也允许用户自定义。
   */
  displayName: string

  /**
   * 分组名称，用于左侧/弹窗分组展示。
   * 由后端或前端根据 modelId 推断，也可以被用户/程序覆盖。
   */
  group?: string
}

/**
 * 模型提供商协议类型
 */
export type ModelProviderProtocol = 'openai'

/**
 * 单个模型提供商配置（持久化到 SQLite）
 */
export interface PersistedModelProviderConfig {
  /**
   * 提供商唯一 ID，由系统生成，例如：
   * - openai-1
   * - provider-1700000000000
   */
  id: string

  /**
   * 提供商名称，用于 UI 展示。
   */
  name: string

  /**
   * 使用的协议类型，例如 openai（兼容 /v1/* 路径）。
   */
  protocol: ModelProviderProtocol

  /**
   * 是否启用此提供商。
   */
  enabled: boolean

  /**
   * API 根地址，推荐只填 Host 部分，例如：
   * - https://api.openai.com
   * - https://api.siliconflow.cn
   */
  baseUrl: string

  /**
   * 用于访问该提供商的 API Key。
   */
  apiKey: string

  /**
   * 预留：自定义 Header
   */
  defaultHeaders?: Record<string, string>

  /**
   * 用户已选择并持久化的模型列表。
   */
  models: PersistedModelConfig[]
}

/**
 * 整体模型配置文件结构
 */
export interface ModelConfig {
  /**
   * 配置版本号，方便未来向后兼容/迁移。
   */
  version: number

  /**
   * 最近一次更新的时间字符串（ISO8601）。
   */
  updatedAt: string

  /**
   * 当前激活的模型提供商 ID（可选）。
   */
  activeProviderId?: string | null

  /**
   * 已配置的模型提供商列表。
   */
  providers: PersistedModelProviderConfig[]
}

/**
 * 从远程 API 获取的模型信息（OpenAI /models 响应格式）
 */
export interface RemoteModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
}

/**
 * 按分组组织的远程模型列表
 */
export interface RemoteModelGroups {
  [groupName: string]: RemoteModelInfo[]
}

/**
 * ModelConfig 相关的 Preload API 契约
 */
export interface ModelConfigAPI {
  /**
   * 获取当前模型配置
   */
  get: () => Promise<ApiResponse<ModelConfig>>

  /**
   * 更新模型配置（以 patch 形式）
   */
  update: (patch: Partial<ModelConfig>) => Promise<ApiResponse<ModelConfig>>

  /**
   * 从指定提供商的 API 同步模型列表
   */
  syncModels: (providerId: string) => Promise<ApiResponse<RemoteModelGroups>>
}
