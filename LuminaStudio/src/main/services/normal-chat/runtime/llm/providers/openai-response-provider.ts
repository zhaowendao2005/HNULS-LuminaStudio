import OpenAI from 'openai'
import type { ResponseStreamEvent } from 'openai/resources/responses/responses'
import type { NormalChatModelStreamEvent } from '../model-adapter.interface'
import type { NormalChatProviderConfig } from './provider-config.types'
import type { NormalChatProviderPromptInput } from './index'
import { extractProviderError } from './provider-error'
import { createProviderRequestCaptureFetch } from './provider-request-capture'

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

function createClient(config: NormalChatProviderConfig, streaming: boolean): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ? normalizeBaseUrl(config.baseUrl) : undefined,
    defaultHeaders: config.defaultHeaders,
    fetch: createProviderRequestCaptureFetch({
      config,
      streaming
    })
  })
}

export async function callOpenAIResponseProvider(
  config: NormalChatProviderConfig,
  prompt: NormalChatProviderPromptInput
): Promise<string> {
  const client = createClient(config, false)

  try {
    const response = await client.responses.create({
      model: config.modelId,
      instructions: prompt.systemPrompt,
      input: prompt.roundPrompt
    })
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
    const top = response as unknown as Record<string, unknown>
    if (typeof top.output_text === 'string') return top.output_text
    return ''
  } catch (err) {
    throw new Error(extractProviderError(err))
  }
}

export async function* streamOpenAIResponseProvider(
  config: NormalChatProviderConfig,
  prompt: NormalChatProviderPromptInput
): AsyncGenerator<NormalChatModelStreamEvent, string, void> {
  const client = createClient(config, true)

  try {
    const startedAt = Date.now()
    const stream = await client.responses.create({
      model: config.modelId,
      instructions: prompt.systemPrompt,
      input: prompt.roundPrompt,
      stream: true
    })

    let emittedFirstToken = false
    let buffer = ''
    yield { type: 'start' }

    for await (const event of stream) {
      const typed = event as ResponseStreamEvent
      if (typed.type === 'response.output_text.delta') {
        if (!emittedFirstToken) {
          emittedFirstToken = true
          yield { type: 'first-token', latencyMs: Date.now() - startedAt }
        }
        buffer += typed.delta
        yield { type: 'text-delta', delta: typed.delta }
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
