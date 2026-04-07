/**
 * Model Config Store 本地类型定义（UI 层）
 */

export type ProviderType = 'openai' | 'openai-response' | 'openai-completion' | 'claude' | 'gemini'
export type ProviderIcon = 'openai' | 'anthropic' | 'google' | 'server' | 'box'

export interface Model {
  id: string
  name: string
  group?: string
}

export interface ModelProvider {
  id: string
  type: ProviderType
  name: string
  apiKey: string
  baseUrl: string
  officialWebsite: string
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

export interface ModelTestState {
  status: 'idle' | 'testing' | 'success' | 'error'
  latency?: number
  message?: string
  errorCode?: string
  errorType?: string
  updatedAt?: number
}

export interface ProviderTypeOption {
  id: ProviderType
  name: string
  description: string
  available: boolean
}

export interface ProviderForm {
  id: string | null
  type: ProviderType
  name: string
}

export interface NewModelForm {
  id: string
  name: string
  group?: string
}
