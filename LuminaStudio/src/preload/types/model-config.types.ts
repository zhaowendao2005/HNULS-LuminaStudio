import type { ApiResponse } from './base.types'

export interface PersistedModelConfig {
  id: string
  displayName: string
  group?: string
}

export type ModelProviderProtocol =
  | 'openai'
  | 'openai-response'
  | 'openai-completion'
  | 'claude'
  | 'gemini'

export interface PersistedModelProviderConfig {
  id: string
  name: string
  protocol: ModelProviderProtocol
  enabled: boolean
  baseUrl: string
  apiKey: string
  officialWebsite: string
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

export interface SmokeTestResult {
  providerId: string
  modelId: string
  status: 'success' | 'error'
  latency: number
  message?: string
  errorCode?: string
  errorType?: string
}

export interface SmokeTestPromptConfig {
  id: string
  name: string
  prompt: string
  createdAt: string
  updatedAt: string
}

export interface SmokeTestPromptSettings {
  version: number
  activeConfigId: string | null
  configs: SmokeTestPromptConfig[]
}

export interface ModelConfigAPI {
  get: () => Promise<ApiResponse<ModelConfig>>
  update: (patch: Partial<ModelConfig>) => Promise<ApiResponse<ModelConfig>>
  syncModels: (providerId: string) => Promise<ApiResponse<RemoteModelGroups>>
  testProvider: (
    providerId: string,
    modelId: string,
    prompt?: string
  ) => Promise<ApiResponse<SmokeTestResult>>
  getSmokeTestPromptSettings: () => Promise<ApiResponse<SmokeTestPromptSettings>>
  updateSmokeTestPromptSettings: (
    settings: SmokeTestPromptSettings
  ) => Promise<ApiResponse<SmokeTestPromptSettings>>
}
