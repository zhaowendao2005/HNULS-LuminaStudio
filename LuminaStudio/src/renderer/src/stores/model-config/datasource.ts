/**
 * Model Config DataSource
 *
 * 数据源适配器：负责 Renderer ↔ Preload API 之间的类型映射和数据转换。
 */
import type { ModelConfig } from '@preload/types'
import type { ModelProvider, ProviderIcon, ProviderType, RemoteModelGroups } from './types'

function inferIconFromProtocol(protocol: ProviderType): ProviderIcon {
  if (protocol === 'openai' || protocol === 'openai-response' || protocol === 'openai-completion') {
    return 'openai'
  }
  if (protocol === 'claude') return 'anthropic'
  if (protocol === 'gemini') return 'google'
  return 'server'
}

function mapConfigToProviders(config: ModelConfig | null): ModelProvider[] {
  if (!config?.providers) return []
  return config.providers.map((provider) => ({
    id: provider.id,
    type: provider.protocol,
    name: provider.name,
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    icon: inferIconFromProtocol(provider.protocol),
    enabled: provider.enabled,
    models: provider.models.map((model) => ({
      id: model.id,
      name: model.displayName,
      group: model.group
    }))
  }))
}

function mapProvidersToConfigPatch(
  providers: ModelProvider[],
  activeProviderId: string | null
): Partial<ModelConfig> {
  return {
    activeProviderId: activeProviderId || undefined,
    providers: providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      protocol: provider.type,
      enabled: provider.enabled,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      models: provider.models.map((model) => ({
        id: model.id,
        displayName: model.name,
        group: model.group
      }))
    }))
  }
}

export const ModelConfigDataSource = {
  async getProviders(): Promise<{ providers: ModelProvider[]; activeProviderId: string | null }> {
    const response = await window.api.modelConfig.get()
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load model config')
    }

    const isDefaultConfig =
      response.data.updatedAt === new Date(0).toISOString() && response.data.providers.length === 0

    if (isDefaultConfig) {
      await window.api.modelConfig.update({
        version: 2,
        activeProviderId: null,
        providers: []
      })
    }

    return {
      providers: mapConfigToProviders(response.data),
      activeProviderId: response.data.activeProviderId || null
    }
  },

  async syncRemoteModels(providerId: string): Promise<RemoteModelGroups> {
    const response = await window.api.modelConfig.syncModels(providerId)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to sync remote models')
    }
    return response.data
  },

  async saveProviders(providers: ModelProvider[], activeProviderId: string | null): Promise<void> {
    const patch = mapProvidersToConfigPatch(providers, activeProviderId)
    const response = await window.api.modelConfig.update(patch)
    if (!response.success) {
      throw new Error(response.error || 'Failed to save model config')
    }
  }
}
