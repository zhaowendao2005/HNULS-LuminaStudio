import Anthropic from '@anthropic-ai/sdk'
import type { MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages/messages'
import type { NormalChatModelStreamEvent } from '../model-adapter.interface'
import type { NormalChatProviderConfig } from './provider-config.types'
import type { NormalChatProviderPromptInput } from './index'
import { extractProviderError } from './provider-error'
import { createProviderRequestCaptureFetch } from './provider-request-capture'

const DEFAULT_ANTHROPIC_MAX_TOKENS = 4096

function createClient(config: NormalChatProviderConfig, streaming: boolean): Anthropic {
  return new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || undefined,
    defaultHeaders: config.defaultHeaders,
    fetch: createProviderRequestCaptureFetch({
      config,
      streaming
    })
  })
}

export async function callClaudeProvider(
  config: NormalChatProviderConfig,
  prompt: NormalChatProviderPromptInput
): Promise<string> {
  const client = createClient(config, false)

  try {
    const message = await client.messages.create({
      model: config.modelId,
      max_tokens: DEFAULT_ANTHROPIC_MAX_TOKENS,
      system: prompt.systemPrompt,
      messages: [{ role: 'user', content: prompt.roundPrompt }]
    })

    return message.content
      .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
      .join('')
  } catch (err) {
    throw new Error(extractProviderError(err))
  }
}

export async function* streamClaudeProvider(
  config: NormalChatProviderConfig,
  prompt: NormalChatProviderPromptInput
): AsyncGenerator<NormalChatModelStreamEvent, string, void> {
  const client = createClient(config, true)

  try {
    const startedAt = Date.now()
    const stream = await client.messages.create({
      model: config.modelId,
      max_tokens: DEFAULT_ANTHROPIC_MAX_TOKENS,
      system: prompt.systemPrompt,
      messages: [{ role: 'user', content: prompt.roundPrompt }],
      stream: true
    })

    let emittedFirstToken = false
    let buffer = ''
    yield { type: 'start' }

    for await (const event of stream) {
      const typed = event as MessageStreamEvent
      if (typed.type === 'content_block_delta' && typed.delta.type === 'text_delta') {
        const deltaText = typed.delta.text
        if (!deltaText) {
          continue
        }
        if (!emittedFirstToken) {
          emittedFirstToken = true
          yield { type: 'first-token', latencyMs: Date.now() - startedAt }
        }
        buffer += deltaText
        yield { type: 'text-delta', delta: deltaText }
      }
    }

    yield { type: 'done', fullText: buffer }
    return buffer
  } catch (err) {
    const message = extractProviderError(err)
    yield { type: 'error', message }
    throw new Error(message)
  }
}
