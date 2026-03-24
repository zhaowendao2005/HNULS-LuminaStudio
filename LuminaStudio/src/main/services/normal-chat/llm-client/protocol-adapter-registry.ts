import OpenAI from 'openai'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogle } from '@langchain/google'
import {
  ChatOpenAI,
  ChatOpenAICompletions,
  type ClientOptions as OpenAIClientOptions
} from '@langchain/openai'
import type { ModelProviderProtocol } from '@preload/types'

export type NormalChatSupportedChatModel =
  | ChatOpenAI
  | ChatOpenAICompletions
  | ChatAnthropic
  | ChatGoogle

export interface NormalChatResolvedProviderTarget {
  providerId: string
  providerName: string
  protocol: ModelProviderProtocol
  baseUrl: string
  apiKey: string
  defaultHeaders: Record<string, string>
  modelId: string
}

interface NormalChatProtocolAdapter {
  createChatModel(target: NormalChatResolvedProviderTarget): Promise<NormalChatSupportedChatModel>
  invokeStructuredOutput?: (params: {
    target: NormalChatResolvedProviderTarget
    schema: unknown
    schemaName: string
    messages: Array<{ content?: unknown }>
  }) => Promise<unknown>
}

function extractHttpStatusFromError(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const candidates = [
    (error as { status?: unknown }).status,
    (error as { statusCode?: unknown }).statusCode,
    (error as { code?: unknown }).code,
    (error as { response?: { status?: unknown; statusCode?: unknown } }).response?.status,
    (error as { response?: { status?: unknown; statusCode?: unknown } }).response?.statusCode,
    (error as { cause?: unknown }).cause
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate
    }
    if (typeof candidate === 'string') {
      const httpMatch = candidate.match(/HTTP[_\s:-]*(\d{3})/i)
      if (httpMatch?.[1]) {
        return Number(httpMatch[1])
      }
      if (/^\d{3}$/.test(candidate)) {
        return Number(candidate)
      }
    }
    if (candidate && typeof candidate === 'object') {
      const nested = extractHttpStatusFromError(candidate)
      if (nested) {
        return nested
      }
    }
  }

  const rawMessage = error instanceof Error ? error.message : String(error)
  const messageMatch = rawMessage.match(/\b(4\d{2}|5\d{2})\b/)
  return messageMatch?.[1] ? Number(messageMatch[1]) : null
}

function formatUpstreamHttpError(error: unknown, fallbackMessage: string): string {
  const status = extractHttpStatusFromError(error)
  if (!status) {
    return fallbackMessage
  }

  const rawMessage = error instanceof Error ? error.message : String(error)
  const statusTextMatch = rawMessage.match(
    /\b(?:HTTP\s*)?(4\d{2}|5\d{2})[:\s-]*([A-Za-z][A-Za-z\s-]{2,})?/i
  )
  const statusText = statusTextMatch?.[2]?.trim()

  if (statusText) {
    return `上游请求失败：HTTP ${status} ${statusText}`
  }

  return `上游请求失败：HTTP ${status}`
}

function normalizeOpenAIBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const url = new URL(trimmed)
    let path = url.pathname.replace(/\/+$/, '')

    // 用户经常直接粘完整 endpoint，这里统一回退到“根 + /v1”，交给 SDK 自己拼子路径。
    if (path.endsWith('/chat/completions')) {
      path = path.slice(0, -'/chat/completions'.length)
    } else if (path.endsWith('/chat/completion')) {
      path = path.slice(0, -'/chat/completion'.length)
    } else if (path.endsWith('/responses')) {
      path = path.slice(0, -'/responses'.length)
    }

    if (!path || path === '/') {
      path = '/v1'
    } else if (!path.endsWith('/v1')) {
      path = `${path}/v1`
    }

    url.pathname = path
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

function parseGeminiBaseUrl(baseUrl: string): { endpoint?: string; apiVersion?: string } {
  if (!baseUrl) {
    return {}
  }

  try {
    const url = new URL(baseUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    const apiVersion = parts[0]
    return {
      endpoint: url.host,
      apiVersion
    }
  } catch {
    return {}
  }
}

function buildOpenAIConfiguration(
  target: NormalChatResolvedProviderTarget
): OpenAIClientOptions | undefined {
  const normalizedBaseUrl = normalizeOpenAIBaseUrl(target.baseUrl)
  const defaultHeaders =
    Object.keys(target.defaultHeaders).length > 0 ? { ...target.defaultHeaders } : undefined

  if (!normalizedBaseUrl && !defaultHeaders) {
    return undefined
  }

  return {
    ...(normalizedBaseUrl ? { baseURL: normalizedBaseUrl } : {}),
    ...(defaultHeaders ? { defaultHeaders } : {})
  }
}

class OpenAICompatibleProtocolAdapter implements NormalChatProtocolAdapter {
  async createChatModel(
    target: NormalChatResolvedProviderTarget
  ): Promise<NormalChatSupportedChatModel> {
    return new ChatOpenAICompletions({
      model: target.modelId,
      apiKey: target.apiKey,
      configuration: buildOpenAIConfiguration(target)
    })
  }
}

class OpenAIResponsesProtocolAdapter implements NormalChatProtocolAdapter {
  async createChatModel(
    target: NormalChatResolvedProviderTarget
  ): Promise<NormalChatSupportedChatModel> {
    return new ChatOpenAI({
      model: target.modelId,
      apiKey: target.apiKey,
      configuration: buildOpenAIConfiguration(target),
      useResponsesApi: true
    })
  }

  async invokeStructuredOutput(params: {
    target: NormalChatResolvedProviderTarget
    schema: unknown
    schemaName: string
    messages: Array<{ content?: unknown }>
  }): Promise<unknown> {
    const { target, schema, schemaName, messages } = params
    const zodSchema = schema as z.ZodTypeAny
    const jsonSchema = zodToJsonSchema(zodSchema, {
      name: schemaName,
      $refStrategy: 'none'
    })

    const input = messages
      .map((message) => {
        const content = message.content
        if (typeof content === 'string') return content
        if (Array.isArray(content)) {
          return content
            .map((item) => {
              if (typeof item === 'string') return item
              if (
                typeof item === 'object' &&
                item &&
                'text' in item &&
                typeof item.text === 'string'
              ) {
                return item.text
              }
              return ''
            })
            .join('')
        }
        return String(content ?? '')
      })
      .filter(Boolean)
      .join('\n')

    const client = new OpenAI({
      apiKey: target.apiKey,
      baseURL: normalizeOpenAIBaseUrl(target.baseUrl) || undefined,
      defaultHeaders:
        Object.keys(target.defaultHeaders).length > 0 ? { ...target.defaultHeaders } : undefined
    })

    try {
      const response = await client.responses.create({
        model: target.modelId,
        input,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: schemaName,
            schema: jsonSchema,
            strict: true
          }
        }
      })

      const outputText = (response as { output_text?: string }).output_text ?? ''
      if (!outputText) {
        throw new Error('Structured output is empty')
      }

      return JSON.parse(outputText)
    } catch (error) {
      const normalized = formatUpstreamHttpError(
        error,
        error instanceof Error ? error.message : String(error)
      )
      if (normalized !== (error instanceof Error ? error.message : String(error))) {
        throw new Error(normalized)
      }

      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to parse structured output JSON: ${message}`)
    }
  }
}

class AnthropicProtocolAdapter implements NormalChatProtocolAdapter {
  async createChatModel(
    target: NormalChatResolvedProviderTarget
  ): Promise<NormalChatSupportedChatModel> {
    return new ChatAnthropic({
      model: target.modelId,
      apiKey: target.apiKey,
      anthropicApiUrl: target.baseUrl || undefined
    })
  }
}

class GeminiProtocolAdapter implements NormalChatProtocolAdapter {
  async createChatModel(
    target: NormalChatResolvedProviderTarget
  ): Promise<NormalChatSupportedChatModel> {
    const geminiConfig = parseGeminiBaseUrl(target.baseUrl)
    if (target.baseUrl && !geminiConfig.endpoint) {
      throw new Error(
        `Gemini provider baseUrl 格式不合法: ${target.baseUrl}。` +
          '期望示例：https://generativelanguage.googleapis.com/v1beta'
      )
    }

    return new ChatGoogle({
      model: target.modelId,
      apiKey: target.apiKey,
      endpoint: geminiConfig.endpoint,
      apiVersion: geminiConfig.apiVersion
    })
  }
}

export class NormalChatProtocolAdapterRegistry {
  private readonly adapters = new Map<ModelProviderProtocol, NormalChatProtocolAdapter>()

  constructor() {
    const openAICompatibleAdapter = new OpenAICompatibleProtocolAdapter()
    this.adapters.set('openai', openAICompatibleAdapter)
    this.adapters.set('openai-completion', openAICompatibleAdapter)
    this.adapters.set('openai-response', new OpenAIResponsesProtocolAdapter())
    this.adapters.set('claude', new AnthropicProtocolAdapter())
    this.adapters.set('gemini', new GeminiProtocolAdapter())
  }

  async createChatModel(
    target: NormalChatResolvedProviderTarget
  ): Promise<NormalChatSupportedChatModel> {
    return this.requireAdapter(target.protocol).createChatModel(target)
  }

  async invokeStructuredOutput(params: {
    target: NormalChatResolvedProviderTarget
    schema: unknown
    schemaName: string
    messages: Array<{ content?: unknown }>
  }): Promise<unknown> {
    const adapter = this.requireAdapter(params.target.protocol)
    if (!adapter.invokeStructuredOutput) {
      throw new Error(
        `invokeStructuredOutput only supports openai-response, got ${params.target.protocol}`
      )
    }

    return adapter.invokeStructuredOutput(params)
  }

  private requireAdapter(protocol: ModelProviderProtocol): NormalChatProtocolAdapter {
    const adapter = this.adapters.get(protocol)
    if (!adapter) {
      throw new Error(`Unsupported provider protocol: ${protocol}`)
    }

    return adapter
  }
}
