import { BaseIPCHandler } from './base-handler'
import { logger } from '../services/logger'
import type { KnowledgeRetrievalService } from '../services/knowledge-retrieval'
import type { KnowledgeDatabaseBridgeService } from '../services/knowledge-database-bridge'
import type { KGRetrievalService } from '../services/kg-retrieval/kg-retrieval-service'
import type {
  KnowledgeDatabaseListDocsRequest,
  KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest,
  KnowledgeDatabaseSearchKnowledgeRetrievalRequest
} from '@preload/types'
import type { KGRetrievalSearchRequest } from '@shared/knowledge-database-api.types'

/**
 * KnowledgeDatabaseIPCHandler
 *
 * 处理知识库数据相关的 IPC 请求
 *
 * 注册的 channels:
 * - knowledgeDatabase:checkConnection
 * - knowledgeDatabase:listKnowledgeBases
 * - knowledgeDatabase:listDocuments
 * - knowledgeDatabase:resolveKnowledgeRetrievalScopes
 * - knowledgeDatabase:searchKnowledgeRetrieval
 * - knowledgeDatabase:getKGConfigs
 * - knowledgeDatabase:getKGGraphTables
 * - knowledgeDatabase:listKGModels
 * - knowledgeDatabase:kgRetrievalSearch
 */
export class KnowledgeDatabaseIPCHandler extends BaseIPCHandler {
  private readonly log = logger.scope('KnowledgeDatabaseIPCHandler')

  constructor(
    private readonly service: KnowledgeDatabaseBridgeService,
    private readonly knowledgeRetrievalService: KnowledgeRetrievalService,
    private readonly kgRetrievalService?: KGRetrievalService
  ) {
    super()
    this.register()
  }

  protected getChannelPrefix(): string {
    return 'knowledgeDatabase'
  }

  /**
   * 检查与外部服务的连接状态
   */
  async handleCheckConnection(): Promise<
    { success: true; data: unknown } | { success: false; error: string }
  > {
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
  async handleListKnowledgeBases(): Promise<
    { success: true; data: unknown } | { success: false; error: string }
  > {
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

  /**
   * 解析知识检索 scope。
   */
  async handleResolveKnowledgeRetrievalScopes(
    _event: unknown,
    request: KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      if (!request) {
        return { success: false, error: 'Invalid request' }
      }

      const result = await this.knowledgeRetrievalService.resolveScopes(request)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 执行知识检索。
   */
  async handleSearchKnowledgeRetrieval(
    _event: unknown,
    request: KnowledgeDatabaseSearchKnowledgeRetrievalRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      if (!request || typeof request.query !== 'string') {
        return { success: false, error: 'Invalid query' }
      }

      // 这里直接打印“实际进入 main 的请求体”，方便和前端 dev 页对照。
      this.log.debug('searchKnowledgeRetrieval request', {
        query: request.query,
        knowledgeBaseId: request.knowledgeBaseId ?? null,
        knowledgeBaseIds: request.knowledgeBaseIds ?? [],
        selectedKnowledgeBaseIds: request.selectedKnowledgeBaseIds ?? [],
        selectedDocumentFileKeysByKnowledgeBase:
          request.selectedDocumentFileKeysByKnowledgeBase ?? {},
        k: request.k,
        ef: request.ef,
        rerank: request.rerank
      })

      const result = await this.knowledgeRetrievalService.search(request)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ==========================================================================
  // 知识图谱（KG）检索
  // ==========================================================================

  /**
   * 获取知识库的 KG 配置
   */
  async handleGetKGConfigs(
    _event: unknown,
    knowledgeBaseId: number
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      if (typeof knowledgeBaseId !== 'number' || knowledgeBaseId <= 0) {
        return { success: false, error: 'Invalid knowledgeBaseId' }
      }
      const result = await this.service.getKGConfigs(knowledgeBaseId)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取知识库的图谱表信息
   */
  async handleGetKGGraphTables(
    _event: unknown,
    knowledgeBaseId: number
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      if (typeof knowledgeBaseId !== 'number' || knowledgeBaseId <= 0) {
        return { success: false, error: 'Invalid knowledgeBaseId' }
      }
      const result = await this.service.getKGGraphTables(knowledgeBaseId)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取可用的 KG 模型列表
   */
  async handleListKGModels(): Promise<
    { success: true; data: unknown } | { success: false; error: string }
  > {
    try {
      const result = await this.service.listKGModels()
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 执行知识图谱检索
   */
  async handleKgRetrievalSearch(
    _event: unknown,
    request: KGRetrievalSearchRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      if (!request || typeof request.query !== 'string') {
        return { success: false, error: 'Invalid query' }
      }
      if (!this.kgRetrievalService) {
        return { success: false, error: 'KGRetrievalService not initialized' }
      }

      this.log.debug('kgRetrievalSearch request', {
        query: request.query?.slice(0, 60),
        mode: request.mode,
        knowledgeBaseId: request.knowledgeBaseId,
        graphTableBase: request.graphTableBase
      })

      const result = await this.kgRetrievalService.search(request)
      return { success: true, data: result }
    } catch (error) {
      this.log.error('kgRetrievalSearch failed', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
