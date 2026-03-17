import { ChatGoogle } from '@langchain/google'
import type { GenerationModelProviderConfig } from './types'

export function createGoogleGeminiModel(config: GenerationModelProviderConfig) {
  return new ChatGoogle({
    model: config.modelId,
    apiKey: config.apiKey,
    clientOptions: {
      baseUrl: config.baseUrl || undefined,
      customHeaders: config.defaultHeaders
    }
  })
}
