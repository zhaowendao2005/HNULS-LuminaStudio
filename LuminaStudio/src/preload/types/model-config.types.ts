import type { ApiResponse } from './base.types'

/**
 * 单个模型配置（持久化到 SQLite）。
 */
export interface PersistedModelConfig {
  id: string
  displayName: string
  group?: string
}

/**
 * 模型提供商协议类型。
 *
 * 这里的协议不是 UI 装饰，而是后续主进程 / utility 选择底层调用方式的权威字段。
 */
export type ModelProviderProtocol =
  | 'openai'
  | 'openai-response'
  | 'openai-completion'
  | 'claude'
  | 'gemini'

/**
 * 单个模型提供商配置（持久化到 SQLite）。
 */
export interface PersistedModelProviderConfig {
  id: string
  name: string
  protocol: ModelProviderProtocol
  enabled: boolean
  baseUrl: string
  apiKey: string
  defaultHeaders?: Record<string, string>
  models: PersistedModelConfig[]
}

/**
 * 整体模型配置文件结构。
 */
export interface ModelConfig {
  version: number
  updatedAt: string
  activeProviderId?: string | null
  providers: PersistedModelProviderConfig[]
}

/**
 * 从远程 API 获取的模型信息（/models 响应格式）。
 */
export interface RemoteModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
}

/**
 * 按分组组织的远程模型列表。
 */
export interface RemoteModelGroups {
  [groupName: string]: RemoteModelInfo[]
}

/**
 * ModelConfig 相关的 Preload API 契约。
 */
export interface ModelConfigAPI {
  get: () => Promise<ApiResponse<ModelConfig>>
  update: (patch: Partial<ModelConfig>) => Promise<ApiResponse<ModelConfig>>
  syncModels: (providerId: string) => Promise<ApiResponse<RemoteModelGroups>>
}
