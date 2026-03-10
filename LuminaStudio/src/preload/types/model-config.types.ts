import type { ApiResponse } from './base.types'

export interface PersistedModelConfig {
  id: string
  displayName: string
  group?: string
}

export type ModelProviderProtocol = 'openai' | 'custom'
export type ModelProviderApiMode = 'auto' | 'responses' | 'chat-completions'

export interface PersistedModelProviderConfig {
  id: string
  name: string
  protocol: ModelProviderProtocol
  apiMode: ModelProviderApiMode
  enabled: boolean
  baseUrl: string
  apiKey: string
  defaultHeaders?: Record<string, string>
  models: PersistedModelConfig[]
}

export interface ModelConfig {
  version: number
  updatedAt: string
  activeProviderId?: string | null
  providers: PersistedModelProviderConfig[]
}

export interface RemoteModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface RemoteModelGroups {
  [groupName: string]: RemoteModelInfo[]
}

export interface ModelConfigAPI {
  get: () => Promise<ApiResponse<ModelConfig>>
  update: (patch: Partial<ModelConfig>) => Promise<ApiResponse<ModelConfig>>
  syncModels: (providerId: string) => Promise<ApiResponse<RemoteModelGroups>>
}
