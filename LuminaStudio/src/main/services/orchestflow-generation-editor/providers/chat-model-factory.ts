import { createAnthropicMessagesModel } from './anthropic-messages-model'
import { createGoogleGeminiModel } from './google-gemini-model'
import { createOpenAIChatModel } from './openai-response-model'
import { createOpenAIResponsesModel } from './openai-responses-model'
import type { GenerationModelProviderConfig, ResolvedGenerationModel } from './types'

export function resolveGenerationVendor(protocol: string): ResolvedGenerationModel['vendor'] {
  if (protocol === 'claude') return 'anthropic'
  if (protocol === 'gemini') return 'google'
  return 'openai'
}

export function createGenerationChatModel(config: GenerationModelProviderConfig) {
  const vendor = resolveGenerationVendor(config.protocol)
  if (vendor === 'anthropic') return createAnthropicMessagesModel(config)
  if (vendor === 'google') return createGoogleGeminiModel(config)

  // Orchestflow generation editor: 按 provider protocol 选择底层 API。
  // - openai: Chat Completions / OpenAI-compatible chat
  // - openai-response: OpenAI Responses API
  if (config.protocol === 'openai-response') {
    return createOpenAIResponsesModel(config)
  }

  // 默认走 openai chat
  return createOpenAIChatModel(config)
}
