import { BaseIPCHandler } from './base-handler'
import type { PaperRetrievalSearchRequest } from '../../preload/types/paper-retrieval.types'
import type { PaperRetrievalService } from '../services/paper-retrieval'

/**
 * Paper Retrieval IPC Handler。
 *
 * 注册的 channels:
 * - paperRetrieval:listProviders
 * - paperRetrieval:getProviderDescriptor
 * - paperRetrieval:search
 */
export class PaperRetrievalIPCHandler extends BaseIPCHandler {
  constructor(private readonly paperRetrievalService: PaperRetrievalService) {
    super()
    this.register()
  }

  protected getChannelPrefix(): string {
    return 'paperRetrieval'
  }

  /**
   * 获取全部 provider 描述信息。
   */
  async handleListProviders(): Promise<
    { success: true; data: unknown } | { success: false; error: string }
  > {
    const providers = await this.paperRetrievalService.listProviders()
    return {
      success: true,
      data: providers
    }
  }

  /**
   * 获取单个 provider descriptor。
   */
  async handleGetProviderDescriptor(
    _event: unknown,
    providerId: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (typeof providerId !== 'string' || !providerId.trim()) {
      return {
        success: false,
        error: 'Invalid providerId'
      }
    }

    const descriptor = await this.paperRetrievalService.getProviderDescriptor(providerId)
    return {
      success: true,
      data: descriptor
    }
  }

  /**
   * 执行论文检索。
   */
  async handleSearch(
    _event: unknown,
    request: unknown
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request || typeof request !== 'object') {
      return {
        success: false,
        error: 'Invalid search request'
      }
    }

    const result = await this.paperRetrievalService.search(request as PaperRetrievalSearchRequest)
    return {
      success: true,
      data: result
    }
  }
}
