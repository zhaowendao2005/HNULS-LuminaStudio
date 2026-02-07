import { BaseIPCHandler } from './base-handler'
import type { RerankModelService } from '../services/rerank-model'

/**
 * RerankModelIPCHandler
 *
 * 处理重排模型相关的 IPC 请求
 *
 * 注册的 channels:
 * - rerankModel:listModels
 */
export class RerankModelIPCHandler extends BaseIPCHandler {
  constructor(private readonly service: RerankModelService) {
    super()
    this.register()
  }

  protected getChannelPrefix(): string {
    return 'rerankModel'
  }

  /**
   * 获取可用的重排模型列表
   */
  async handleListModels(): Promise<
    { success: true; data: unknown } | { success: false; error: string }
  > {
    try {
      const models = await this.service.listRerankModels()
      return { success: true, data: { models } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
