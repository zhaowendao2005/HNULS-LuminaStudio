import type { ModelProviderProtocol, PersistedModelProviderConfig } from '@preload/types'
import type { ModelConfigService } from '../../model-config'
import { logger } from '../../logger'
import {
  NormalChatProtocolAdapterRegistry,
  type NormalChatResolvedProviderTarget,
  type NormalChatSupportedChatModel
} from './protocol-adapter-registry'

export type { NormalChatResolvedProviderTarget, NormalChatSupportedChatModel }

export interface NormalChatProviderProfile {
  id: string
  name: string
  protocol: ModelProviderProtocol
  baseUrl: string
}

export class NormalChatLlmClient {
  private readonly log = logger.scope('NormalChatLlmClient')
  private readonly adapterRegistry = new NormalChatProtocolAdapterRegistry()

  constructor(private readonly modelConfigService: ModelConfigService) {}

  async createChatModel(
    providerId: string,
    modelId: string,
    signal: AbortSignal
  ): Promise<NormalChatSupportedChatModel> {
    const target = await this.resolveChatTarget(providerId, modelId, signal)
    this.log.debug('NormalChat provider target resolved', {
      providerId: target.providerId,
      protocol: target.protocol,
      baseUrl: target.baseUrl,
      modelId: target.modelId
    })
    return this.adapterRegistry.createChatModel(target)
  }

  async invokeStructuredOutput(params: {
    providerId: string
    modelId: string
    schema: unknown
    schemaName: string
    messages: Array<{ content?: unknown }>
    signal: AbortSignal
  }): Promise<unknown> {
    const target = await this.resolveChatTarget(params.providerId, params.modelId, params.signal)
    return this.adapterRegistry.invokeStructuredOutput({
      target,
      schema: params.schema,
      schemaName: params.schemaName,
      messages: params.messages
    })
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

  async resolveChatTarget(
    providerId: string,
    modelId: string,
    signal: AbortSignal
  ): Promise<NormalChatResolvedProviderTarget> {
    const provider = await this.resolveEnabledProvider(providerId, signal)
    const model = provider.models.find((item) => item.id === modelId)
    if (!model) {
      throw new Error(`Model not found for provider ${providerId}: ${modelId}`)
    }

    return {
      providerId: provider.id,
      providerName: provider.name,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      defaultHeaders: provider.defaultHeaders ?? {},
      modelId: model.id
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
