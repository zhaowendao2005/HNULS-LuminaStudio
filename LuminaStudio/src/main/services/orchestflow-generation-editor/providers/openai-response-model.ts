import { ChatOpenAI } from '@langchain/openai'
import type { GenerationModelProviderConfig } from './types'

function normalizeOpenAIBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

/**
 * OpenAI Chat Completions / OpenAI-compatible chat endpoint.
 * 对应 provider protocol: openai
 */
export function createOpenAIChatModel(config: GenerationModelProviderConfig) {
  return new ChatOpenAI({
    model: config.modelId,
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseUrl ? normalizeOpenAIBaseUrl(config.baseUrl) : undefined,
      defaultHeaders: config.defaultHeaders
    }
  })
}
