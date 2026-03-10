/**
 * Model Config DataSource
 */
import type { ModelProvider, RemoteModelGroups, ProviderIcon } from './types'
import type { ModelConfig } from '@preload/types'

function inferIconFromProtocol(protocol: string): ProviderIcon {
  if (protocol === 'openai') return 'openai'
  return 'server'
}

function mapConfigToProviders(config: ModelConfig | null): ModelProvider[] {
  if (!config || !config.providers) return []
  return config.providers.map((p) => ({
    id: p.id,
    type: p.protocol,
    apiMode: p.apiMode,
    name: p.name,
    apiKey: p.apiKey,
    baseUrl: p.baseUrl,
    icon: inferIconFromProtocol(p.protocol),
    enabled: p.enabled,
    models: p.models.map((m) => ({
      id: m.id,
      name: m.displayName,
      group: m.group
    }))
  }))
}

function mapProvidersToConfigPatch(
  providers: ModelProvider[],
  activeProviderId: string | null
): Partial<ModelConfig> {
  return {
    activeProviderId: activeProviderId || undefined,
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      protocol: p.type,
      apiMode: p.apiMode,
      enabled: p.enabled,
      baseUrl: p.baseUrl,
      apiKey: p.apiKey,
      models: p.models.map((m) => ({
        id: m.id,
        displayName: m.name,
        group: m.group
      }))
    }))
  }
}

export const ModelConfigDataSource = {
  async getProviders(): Promise<{ providers: ModelProvider[]; activeProviderId: string | null }> {
    const res = await window.api.modelConfig.get()
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to load model config')

    const isDefaultConfig =
      res.data.updatedAt === new Date(0).toISOString() && res.data.providers.length === 0

    if (isDefaultConfig) {
      await window.api.modelConfig.update({ version: 2, activeProviderId: null, providers: [] })
    }

    return {
      providers: mapConfigToProviders(res.data),
      activeProviderId: res.data.activeProviderId || null
    }
  },

  async syncRemoteModels(providerId: string): Promise<RemoteModelGroups> {
    const res = await window.api.modelConfig.syncModels(providerId)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to sync remote models')
    return res.data
  },

  async saveProviders(providers: ModelProvider[], activeProviderId: string | null): Promise<void> {
    const patch = mapProvidersToConfigPatch(providers, activeProviderId)
    const res = await window.api.modelConfig.update(patch)
    if (!res.success) throw new Error(res.error || 'Failed to save model config')
  }
}
