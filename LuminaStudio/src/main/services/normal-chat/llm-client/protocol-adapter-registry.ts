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
}

function normalizeOpenAIBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const url = new URL(trimmed)
    let path = url.pathname.replace(/\/+$/, '')

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

  private requireAdapter(protocol: ModelProviderProtocol): NormalChatProtocolAdapter {
    const adapter = this.adapters.get(protocol)
    if (!adapter) {
      throw new Error(`Unsupported provider protocol: ${protocol}`)
    }

    return adapter
  }
}
