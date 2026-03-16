import { ChatOpenAI } from '@langchain/openai'
import type { GenerationModelProviderConfig } from './types'

export function createOpenAIResponseModel(config: GenerationModelProviderConfig) {
  return new ChatOpenAI({
    model: config.modelId,
    apiKey: config.apiKey,
    configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined
  })
}
