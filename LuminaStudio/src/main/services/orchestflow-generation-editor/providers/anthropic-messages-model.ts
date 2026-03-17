import { ChatAnthropic } from '@langchain/anthropic'
import type { GenerationModelProviderConfig } from './types'

export function createAnthropicMessagesModel(config: GenerationModelProviderConfig) {
  return new ChatAnthropic({
    model: config.modelId,
    apiKey: config.apiKey,
    clientOptions: {
      baseURL: config.baseUrl || undefined,
      defaultHeaders: config.defaultHeaders
    }
  })
}
