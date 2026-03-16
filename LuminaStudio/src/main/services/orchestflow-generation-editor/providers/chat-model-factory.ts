import { createAnthropicMessagesModel } from './anthropic-messages-model'
import { createGoogleGeminiModel } from './google-gemini-model'
import { createOpenAIResponseModel } from './openai-response-model'
import type { GenerationModelProviderConfig, ResolvedGenerationModel } from './types'

export function resolveGenerationVendor(protocol: string): ResolvedGenerationModel['vendor'] {
  if (protocol === 'claude') {
    return 'anthropic'
  }
  if (protocol === 'gemini') {
    return 'google'
  }
  return 'openai'
}

export function createGenerationChatModel(config: GenerationModelProviderConfig) {
  const vendor = resolveGenerationVendor(config.protocol)
  if (vendor === 'anthropic') {
    return createAnthropicMessagesModel(config)
  }
  if (vendor === 'google') {
    return createGoogleGeminiModel(config)
  }
  return createOpenAIResponseModel(config)
}
