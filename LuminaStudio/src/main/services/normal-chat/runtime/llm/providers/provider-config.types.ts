import type { ModelProviderProtocol } from '@preload/types'

export interface NormalChatProviderConfig {
  providerId: string
  modelId: string
  protocol: ModelProviderProtocol
  apiKey: string
  baseUrl: string
  defaultHeaders?: Record<string, string>
}
