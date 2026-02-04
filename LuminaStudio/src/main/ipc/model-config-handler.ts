import { BaseIPCHandler } from './base-handler'
import type { ModelConfigService } from '../services/model-config'

/**
 * ModelConfigIPCHandler
 *
 * 处理模型配置相关的 IPC 请求
 *
 * 注册的 channels:
 * - modelConfig:get
 * - modelConfig:update
 * - modelConfig:syncmodels
 */
export class ModelConfigIPCHandler extends BaseIPCHandler {
  constructor(private readonly modelConfigService: ModelConfigService) {
    super()
    this.register()
  }

  protected getChannelPrefix(): string {
    return 'modelConfig'
  }

  /**
   * 获取当前模型配置
   */
  async handleGet(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const config = await this.modelConfigService.getConfig()
    return { success: true, data: config }
  }

  /**
   * 更新模型配置
   */
  async handleUpdate(
    _event: unknown,
    patch: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    const config = await this.modelConfigService.updateConfig(patch as never)
    return { success: true, data: config }
  }

  /**
   * 从提供商同步模型列表
   */
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
}
