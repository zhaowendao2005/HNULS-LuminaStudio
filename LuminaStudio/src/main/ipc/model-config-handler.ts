import { BaseIPCHandler } from './base-handler'
import type { ModelConfigService } from '../services/model-config'

/**
 * ModelConfigIPCHandler
 *
 * 处理模型配置相关的 IPC 请求
 */
export class ModelConfigIPCHandler extends BaseIPCHandler {
  constructor(private readonly modelConfigService: ModelConfigService) {
    super()
    this.register()
  }

  protected getChannelPrefix(): string {
    return 'modelConfig'
  }

  async handleGet(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const config = await this.modelConfigService.getConfig()
    return { success: true, data: config }
  }

  async handleUpdate(
    _event: unknown,
    patch: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const config = await this.modelConfigService.updateConfig(patch as never)
    return { success: true, data: config }
  }

  async handleSyncModels(
    _event: unknown,
    providerId: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (typeof providerId !== 'string') {
      return { success: false, error: 'Invalid providerId' }
    }
    const groups = await this.modelConfigService.syncModels(providerId)
    return { success: true, data: groups }
  }

  async handleTestProvider(
    _event: unknown,
    providerId: unknown,
    modelId: unknown,
    prompt?: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (typeof providerId !== 'string') {
      return { success: false, error: 'Invalid providerId' }
    }
    if (typeof modelId !== 'string') {
      return { success: false, error: 'Invalid modelId' }
    }
    if (prompt !== undefined && typeof prompt !== 'string') {
      return { success: false, error: 'Invalid prompt' }
    }

    const result = await this.modelConfigService.testProviderModel(providerId, modelId, prompt)
    return { success: true, data: result }
  }

  async handleGetSmokeTestPromptSettings(): Promise<
    { success: true; data: unknown } | { success: false; error: string }
  > {
    const settings = await this.modelConfigService.getSmokeTestPromptSettings()
    return { success: true, data: settings }
  }

  async handleUpdateSmokeTestPromptSettings(
    _event: unknown,
    settings: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const nextSettings = await this.modelConfigService.updateSmokeTestPromptSettings(
      settings as never
    )
    return { success: true, data: nextSettings }
  }
}
