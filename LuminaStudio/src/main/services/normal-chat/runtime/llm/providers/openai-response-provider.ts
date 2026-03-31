import OpenAI from 'openai'
import type { NormalChatProviderConfig } from './provider-config.types'
import { extractProviderError } from './provider-error'

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

/**
 * 调用 OpenAI Responses API（/v1/responses）。
 * 适用于 protocol = 'openai-response'。
 */
export async function callOpenAIResponseProvider(
  config: NormalChatProviderConfig,
  prompt: string
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ? normalizeBaseUrl(config.baseUrl) : undefined,
    defaultHeaders: config.defaultHeaders
  })

  try {
    const response = await client.responses.create({
      model: config.modelId,
      input: prompt
    })
    // Responses API 返回 output 数组，取第一个 text 类型的内容
    const output = response.output
    if (Array.isArray(output)) {
      for (const item of output) {
        const typed = item as unknown as Record<string, unknown>
        if (typed.type === 'message') {
          const content = typed.content
          if (Array.isArray(content)) {
            for (const part of content) {
              const p = part as Record<string, unknown>
              if (p.type === 'output_text' && typeof p.text === 'string') {
                return p.text
              }
            }
          }
        }
      }
    }
    // fallback：尝试 output_text 顶层
    const top = response as unknown as Record<string, unknown>
    if (typeof top.output_text === 'string') return top.output_text
    return ''
  } catch (err) {
    throw new Error(extractProviderError(err))
  }
}
