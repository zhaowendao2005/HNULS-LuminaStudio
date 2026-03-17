import type { GenerationSdkVendor } from '@preload/types'

export interface GenerationModelProviderConfig {
  providerId: string
  modelId: string
  protocol: string
  baseUrl: string
  apiKey: string
  defaultHeaders?: Record<string, string>
}

export interface ResolvedGenerationModel {
  vendor: GenerationSdkVendor
  protocol: string
  modelId: string
}
