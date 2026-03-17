import OpenAI from 'openai'
import type { GenerationModelProviderConfig } from './types'

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

function mergeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
  if (!headers) return undefined
  const entries = Object.entries(headers).filter(([, v]) => typeof v === 'string')
  return entries.length ? Object.fromEntries(entries) : undefined
}

/**
 * OpenAI Responses API client wrapper.
 * 对应 provider protocol: openai-response
 *
 * 说明：为了在现有 agent 代码不做大改动（仍以 model.invoke / model.stream 使用），
 * 这里实现一个最小的 invoke/stream 适配层，返回 { content } 结构。
 */
export function createOpenAIResponsesModel(config: GenerationModelProviderConfig): {
  invoke: (input: unknown, options?: unknown) => Promise<{ content: string }>
  stream: (input: unknown, options?: unknown) => AsyncIterable<{ content: string }>
} {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ? normalizeBaseUrl(config.baseUrl) : undefined,
    defaultHeaders: mergeHeaders(config.defaultHeaders)
  })

  const buildInputText = (input: unknown): string => {
    if (typeof input === 'string') return input
    if (Array.isArray(input)) {
      // LangChain message array: pick content and concat.
      return (input as Array<{ content?: unknown }>).
        map((m) => (typeof m?.content === 'string' ? m.content : ''))
        .join('\n')
    }
    return String(input ?? '')
  }

  async function invoke(input: unknown): Promise<{ content: string }> {
    const text = buildInputText(input)
    const resp = await client.responses.create({
      model: config.modelId,
      input: text
    })

    // openai SDK provides output_text convenience
    // (fallback to empty string if not present)
    const outputText = (resp as any).output_text
    return { content: typeof outputText === 'string' ? outputText : '' }
  }

  async function* stream(input: unknown): AsyncIterable<{ content: string }> {
    const text = buildInputText(input)

    // Prefer streaming if supported by SDK/runtime
    const streamResp = (client.responses as any).stream
    if (typeof streamResp !== 'function') {
      // Fallback: non-stream invoke, yield once
      const done = await invoke(input)
      if (done.content) yield { content: done.content }
      return
    }

    const streamResult = streamResp.call(client.responses, {
      model: config.modelId,
      input: text
    })

    for await (const event of streamResult as any) {
      // Events shape depends on SDK; handle the common 'response.output_text.delta'
      if (event?.type === 'response.output_text.delta' && typeof event.delta === 'string') {
        yield { content: event.delta }
      }
    }
  }

  return { invoke, stream }
}
