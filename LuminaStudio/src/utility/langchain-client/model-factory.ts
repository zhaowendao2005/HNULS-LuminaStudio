import { ChatOpenAI } from '@langchain/openai'
import type { LangchainClientAgentCreateConfig } from '@shared/langchain-client.types'

/**
 * Normalize OpenAI-compatible baseUrl.
 * - trims whitespace
 * - removes trailing slash
 * - ensures it ends with `/v1`
 */
export function normalizeOpenAICompatibleBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

export function buildChatModel(config: LangchainClientAgentCreateConfig): ChatOpenAI {
  const baseURL = normalizeOpenAICompatibleBaseUrl(config.provider.baseUrl)

  return new ChatOpenAI({
    model: config.modelId,
    apiKey: config.provider.apiKey,
    configuration: {
      baseURL,
      defaultHeaders: config.provider.defaultHeaders
    }
  })
}
