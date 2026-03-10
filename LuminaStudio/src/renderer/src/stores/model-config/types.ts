/**
 * Model Config Store 本地类型定义（UI 层）
 */

export type ProviderType = 'openai' | 'custom'
export type ProviderApiMode = 'auto' | 'responses' | 'chat-completions'
export type ProviderIcon = 'openai' | 'server' | 'box'

export interface Model {
  id: string
  name: string
  group?: string
}

export interface ModelProvider {
  id: string
  type: ProviderType
  apiMode: ProviderApiMode
  name: string
  apiKey: string
  baseUrl: string
  icon: ProviderIcon
  enabled: boolean
  models: Model[]
}

export interface RemoteModel {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface RemoteModelGroups {
  [groupName: string]: RemoteModel[]
}

export interface ProviderTypeOption {
  id: ProviderType
  name: string
  description: string
  available: boolean
}

export interface NewProviderForm {
  type: ProviderType
  name: string
}

export interface NewModelForm {
  id: string
  name: string
  group?: string
}
