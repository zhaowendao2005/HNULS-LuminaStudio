/**
 * Model Config DataSource
 * 
 * 数据源适配器：负责 Renderer ↔ Preload API 之间的类型映射和数据转换
 */
import type { ModelProvider, RemoteModelGroups, ProviderIcon } from './types'
import type { ModelConfig } from '@preload/types'

/**
 * 根据协议类型推断图标
 */
function inferIconFromProtocol(protocol: string): ProviderIcon {
  if (protocol === 'openai') return 'openai'
  return 'server'
}

/**
 * 将后端返回的 ModelConfig 映射为前端 ModelProvider 列表
 */
function mapConfigToProviders(config: ModelConfig | null): ModelProvider[] {
  if (!config || !config.providers) return []
  return config.providers.map((p) => ({
    id: p.id,
    type: p.protocol,
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

/**
 * 将前端 ModelProvider 列表映射为后端 ModelConfig patch
 */
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

/**
 * Model Config 数据源
 */
export const ModelConfigDataSource = {
  /**
   * 获取提供商列表和当前激活的提供商 ID
   */
  async getProviders(): Promise<{ providers: ModelProvider[]; activeProviderId: string | null }> {
    const res = await window.api.modelConfig.get()
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load model config')
    }

    // 检查是否是默认配置（初始状态）
    const isDefaultConfig =
      res.data.updatedAt === new Date(0).toISOString() && res.data.providers.length === 0

    if (isDefaultConfig) {
      // 创建空配置
      await window.api.modelConfig.update({
        version: 1,
        activeProviderId: null,
        providers: []
      })
    }

    return {
      providers: mapConfigToProviders(res.data),
      activeProviderId: res.data.activeProviderId || null
    }
  },

  /**
   * 同步远程模型列表
   */
  async syncRemoteModels(providerId: string): Promise<RemoteModelGroups> {
    const res = await window.api.modelConfig.syncModels(providerId)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to sync remote models')
    }
    return res.data
  },

  /**
   * 保存提供商配置
   */
  async saveProviders(providers: ModelProvider[], activeProviderId: string | null): Promise<void> {
    const patch = mapProvidersToConfigPatch(providers, activeProviderId)
    const res = await window.api.modelConfig.update(patch)
    if (!res.success) {
      throw new Error(res.error || 'Failed to save model config')
    }
  }
}
