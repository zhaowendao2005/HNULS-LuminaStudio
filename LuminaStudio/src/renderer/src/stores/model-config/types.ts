/**
 * Model Config Store 本地类型定义（UI 层）
 *
 * 注意：这些类型仅用于前端 Store 和组件，与 Preload 跨进程类型不同
 */

export type ProviderType = 'openai' | 'custom'
export type ProviderIcon = 'openai' | 'server' | 'box'

/**
 * UI 层的模型配置
 */
export interface Model {
  id: string
  name: string
  group?: string
}

/**
 * UI 层的模型提供商配置
 */
export interface ModelProvider {
  id: string
  type: ProviderType
  name: string
  apiKey: string
  baseUrl: string
  icon: ProviderIcon
  enabled: boolean
  models: Model[]
}

/**
 * 远程模型信息（从 API 返回）
 */
export interface RemoteModel {
  id: string
  object: string
  created: number
  owned_by: string
}

/**
 * 按分组的远程模型
 */
export interface RemoteModelGroups {
  [groupName: string]: RemoteModel[]
}

/**
 * 提供商类型选项
 */
export interface ProviderTypeOption {
  id: ProviderType
  name: string
  description: string
  available: boolean
}

/**
 * 新增提供商表单
 */
export interface NewProviderForm {
  type: ProviderType
  name: string
}

/**
 * 新增模型表单
 */
export interface NewModelForm {
  id: string
  name: string
  group?: string
}
