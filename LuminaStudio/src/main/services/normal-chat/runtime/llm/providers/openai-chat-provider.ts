import OpenAI from 'openai'
import type { NormalChatProviderConfig } from './provider-config.types'
import { extractProviderError } from './provider-error'

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  // openai SDK 要求 baseURL 以 /v1 结尾
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

/**
 * 调用 OpenAI Chat Completions API（/v1/chat/completions）。
 * 适用于 protocol = 'openai' | 'openai-completion'。
 */
export async function callOpenAIChatProvider(
  config: NormalChatProviderConfig,
  prompt: string
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ? normalizeBaseUrl(config.baseUrl) : undefined,
    defaultHeaders: config.defaultHeaders
  })

  try {
    const response = await client.chat.completions.create({
      model: config.modelId,
      messages: [{ role: 'user', content: prompt }]
    })
    return response.choices[0]?.message?.content ?? ''
  } catch (err) {
    throw new Error(extractProviderError(err))
  }
}
