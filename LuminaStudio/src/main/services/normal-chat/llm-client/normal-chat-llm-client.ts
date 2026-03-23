import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogle } from '@langchain/google'
import {
  ChatOpenAI,
  ChatOpenAICompletions,
  type ClientOptions as OpenAIClientOptions
} from '@langchain/openai'
import type { ModelProviderProtocol, PersistedModelProviderConfig } from '@preload/types'
import type { ModelConfigService } from '../../model-config'
import { logger } from '../../logger'

export type NormalChatSupportedChatModel =
  | ChatOpenAI
  | ChatOpenAICompletions
  | ChatAnthropic
  | ChatGoogle

export interface NormalChatProviderProfile {
  id: string
  name: string
  protocol: ModelProviderProtocol
  baseUrl: string
}

export class NormalChatLlmClient {
  private readonly log = logger.scope('NormalChatLlmClient')

  constructor(private readonly modelConfigService: ModelConfigService) {}

  async createChatModel(
    providerId: string,
    modelId: string,
    signal: AbortSignal
  ): Promise<NormalChatSupportedChatModel> {
    const provider = await this.resolveEnabledProvider(providerId, signal)
    const normalizedOpenAIBaseUrl = this.normalizeOpenAIBaseUrl(provider.baseUrl)
    const configuration: OpenAIClientOptions | undefined = normalizedOpenAIBaseUrl
      ? { baseURL: normalizedOpenAIBaseUrl }
      : undefined

    switch (provider.protocol) {
      case 'claude':
        // Anthropic 协议固定走 ChatAnthropic，不做协议回落。
        return new ChatAnthropic({
          model: modelId,
          apiKey: provider.apiKey,
          anthropicApiUrl: provider.baseUrl || undefined
        })
      case 'gemini': {
        // Gemini baseUrl 若配置了但格式不对，直接报错，避免静默走默认端点造成误判。
        const geminiConfig = this.parseGeminiBaseUrl(provider.baseUrl)
        if (provider.baseUrl && !geminiConfig.endpoint) {
          throw new Error(
            `Gemini provider baseUrl 格式不合法: ${provider.baseUrl}。` +
              '期望示例：https://generativelanguage.googleapis.com/v1beta'
          )
        }

        return new ChatGoogle({
          model: modelId,
          apiKey: provider.apiKey,
          endpoint: geminiConfig.endpoint,
          apiVersion: geminiConfig.apiVersion
        })
      }
      case 'openai-response':
        this.log.debug('NormalChat OpenAI-compatible baseURL resolved', {
          providerId,
          protocol: provider.protocol,
          originalBaseUrl: provider.baseUrl,
          normalizedBaseUrl: normalizedOpenAIBaseUrl
        })
        return new ChatOpenAI({
          model: modelId,
          apiKey: provider.apiKey,
          configuration,
          useResponsesApi: true
        })
      case 'openai-completion':
      case 'openai':
        this.log.debug('NormalChat OpenAI-compatible baseURL resolved', {
          providerId,
          protocol: provider.protocol,
          originalBaseUrl: provider.baseUrl,
          normalizedBaseUrl: normalizedOpenAIBaseUrl
        })
        return new ChatOpenAICompletions({
          model: modelId,
          apiKey: provider.apiKey,
          configuration
        })
      default: {
        // 存量脏值或未来扩展协议时，给出明确错误而不是错误回落。
        const protocol = String((provider as { protocol?: unknown }).protocol ?? 'unknown')
        throw new Error(`Unsupported provider protocol: ${protocol}`)
      }
    }
  }

  async getProviderProfile(
    providerId: string,
    signal: AbortSignal
  ): Promise<NormalChatProviderProfile | null> {
    const config = await this.awaitWithAbort(signal, this.modelConfigService.getConfig())
    const provider = config.providers.find((item) => item.id === providerId)
    if (!provider) {
      return null
    }

    return {
      id: provider.id,
      name: provider.name,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl
    }
  }

  private async resolveEnabledProvider(
    providerId: string,
    signal: AbortSignal
  ): Promise<PersistedModelProviderConfig> {
    const config = await this.awaitWithAbort(signal, this.modelConfigService.getConfig())
    this.throwIfAborted(signal)

    const provider = config.providers.find((item) => item.id === providerId && item.enabled)
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`)
    }

    return provider
  }

  private normalizeOpenAIBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim()
    if (!trimmed) {
      return ''
    }

    try {
      const url = new URL(trimmed)
      let path = url.pathname.replace(/\/+$/, '')

      // 用户有时会粘贴完整 endpoint，这里回退到“根 + /v1”形式交给 SDK 拼路径。
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

  private parseGeminiBaseUrl(baseUrl: string): { endpoint?: string; apiVersion?: string } {
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

  private async awaitWithAbort<T>(signal: AbortSignal, task: Promise<T>): Promise<T> {
    this.throwIfAborted(signal)

    let rejectAbort: ((error: Error) => void) | null = null
    const onAbort = () => {
      rejectAbort?.(this.createAbortError())
    }
    const abortPromise = new Promise<never>((_, reject) => {
      rejectAbort = reject
      signal.addEventListener('abort', onAbort, { once: true })
    })

    try {
      return await Promise.race([task, abortPromise])
    } finally {
      signal.removeEventListener('abort', onAbort)
    }
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (!signal.aborted) {
      return
    }

    throw this.createAbortError()
  }

  private createAbortError(): Error {
    const error = new Error('请求已中止')
    error.name = 'AbortError'
    return error
  }
}
