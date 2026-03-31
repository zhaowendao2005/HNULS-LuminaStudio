import { ChatAnthropic } from '@langchain/anthropic'
import type { NormalChatProviderConfig } from './provider-config.types'
import { extractProviderError } from './provider-error'

/**
 * 调用 Anthropic Messages API，通过 @langchain/anthropic 的 ChatAnthropic 封装。
 * 适用于 protocol = 'claude'。
 */
export async function callClaudeProvider(
  config: NormalChatProviderConfig,
  prompt: string
): Promise<string> {
  const model = new ChatAnthropic({
    model: config.modelId,
    apiKey: config.apiKey,
    clientOptions: {
      baseURL: config.baseUrl || undefined,
      defaultHeaders: config.defaultHeaders
    }
  })

  try {
    const result = await model.invoke([{ role: 'user', content: prompt }])
    const content = result.content
    if (typeof content === 'string') return content
    // content 可能是 MessageContentComplex[] 数组
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          const p = part as Record<string, unknown>
          return typeof p.text === 'string' ? p.text : ''
        })
        .join('')
    }
    return String(content)
  } catch (err) {
    throw new Error(extractProviderError(err))
  }
}
