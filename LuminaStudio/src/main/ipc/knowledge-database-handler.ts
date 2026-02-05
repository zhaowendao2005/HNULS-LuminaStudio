import { BaseIPCHandler } from './base-handler'
import type { KnowledgeDatabaseBridgeService } from '../services/knowledge-database-bridge'
import type { KnowledgeDatabaseListDocsRequest } from '@preload/types'

/**
 * KnowledgeDatabaseIPCHandler
 *
 * 处理知识库数据相关的 IPC 请求
 *
 * 注册的 channels:
 * - knowledgeDatabase:checkConnection
 * - knowledgeDatabase:listKnowledgeBases
 * - knowledgeDatabase:listDocuments
 */
export class KnowledgeDatabaseIPCHandler extends BaseIPCHandler {
  constructor(private readonly service: KnowledgeDatabaseBridgeService) {
    super()
    this.register()
  }

  protected getChannelPrefix(): string {
    return 'knowledgeDatabase'
  }

  /**
   * 检查与外部服务的连接状态
   */
  async handleCheckConnection(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      const result = await this.service.checkConnection()
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取所有知识库列表
   */
  async handleListKnowledgeBases(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      const knowledgeBases = await this.service.listKnowledgeBases()
      return { success: true, data: { knowledgeBases } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取指定知识库下的文档列表
   */
  async handleListDocuments(
    _event: unknown,
    request: KnowledgeDatabaseListDocsRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      if (!request || typeof request.knowledgeBaseId !== 'number') {
        return { success: false, error: 'Invalid knowledgeBaseId' }
      }

      const result = await this.service.listDocuments({
        knowledgeBaseId: request.knowledgeBaseId,
        page: request.page,
        pageSize: request.pageSize
      })

      return {
        success: true,
        data: {
          documents: result.documents,
          total: result.pagination.total,
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalPages: result.pagination.totalPages
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
