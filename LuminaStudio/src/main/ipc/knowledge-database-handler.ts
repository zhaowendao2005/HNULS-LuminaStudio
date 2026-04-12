import { BaseIPCHandler } from './base-handler'
import { logger } from '../services/logger'
import type { KnowledgeRetrievalService } from '../services/knowledge-retrieval'
import type { KnowledgeDatabaseBridgeService } from '../services/knowledge-database-bridge'
import type { KGRetrievalService } from '../services/kg-retrieval/kg-retrieval-service'
import type {
  KnowledgeDatabaseListDocumentEmbeddingsRequest,
  KnowledgeDatabaseListDocsRequest,
  KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest,
  KnowledgeDatabaseSearchKnowledgeRetrievalRequest
} from '@preload/types'
import type { KGRetrievalSearchRequest } from '@shared/knowledge-database-api.types'

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

  async handleListDocumentEmbeddings(
    _event: unknown,
    request: KnowledgeDatabaseListDocumentEmbeddingsRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      if (!request || typeof request.knowledgeBaseId !== 'number' || request.knowledgeBaseId <= 0) {
        return { success: false, error: 'Invalid knowledgeBaseId' }
      }
      if (typeof request.fileKey !== 'string' || !request.fileKey.trim()) {
        return { success: false, error: 'Invalid fileKey' }
      }

      const embeddings = await this.service.listDocumentEmbeddings({
        knowledgeBaseId: request.knowledgeBaseId,
        fileKey: request.fileKey
      })

      return { success: true, data: { embeddings } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

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

  async handleSearchKnowledgeRetrieval(
    _event: unknown,
    request: KnowledgeDatabaseSearchKnowledgeRetrievalRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      if (!request || typeof request.knowledgeBaseId !== 'number') {
        return { success: false, error: 'Invalid knowledgeBaseId' }
      }
      if (typeof request.tableName !== 'string' || !request.tableName.trim()) {
        return { success: false, error: 'Invalid tableName' }
      }
      if (typeof request.queryText !== 'string' || !request.queryText.trim()) {
        return { success: false, error: 'Invalid queryText' }
      }
      if (Array.isArray(request.fileKeys) && request.fileKeys.length === 0) {
        return { success: false, error: 'fileKeys cannot be an empty array' }
      }

      this.log.debug('searchKnowledgeRetrieval request', {
        knowledgeBaseId: request.knowledgeBaseId,
        tableName: request.tableName,
        queryText: request.queryText,
        fileKey: request.fileKey ?? null,
        fileKeys: request.fileKeys ?? null,
        k: request.k,
        ef: request.ef,
        rerankModelId: request.rerankModelId ?? null,
        rerankTopN: request.rerankTopN ?? null
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

  async handleListKGKnowledgeBases(): Promise<
    { success: true; data: unknown } | { success: false; error: string }
  > {
    try {
      const knowledgeBases = await this.service.listKGKnowledgeBases()
      return { success: true, data: { knowledgeBases } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async handleKgRetrievalSearch(
    _event: unknown,
    request: KGRetrievalSearchRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    try {
      if (!request || typeof request.graphTableBase !== 'string' || !request.graphTableBase.trim()) {
        return { success: false, error: 'Invalid graphTableBase' }
      }
      const hasQuery = typeof request.query === 'string' && request.query.trim().length > 0
      const hasHighLevelKeywords =
        Array.isArray(request.highLevelKeywords) && request.highLevelKeywords.some((item) => item.trim())
      const hasLowLevelKeywords =
        Array.isArray(request.lowLevelKeywords) && request.lowLevelKeywords.some((item) => item.trim())
      if (!hasQuery && !hasHighLevelKeywords && !hasLowLevelKeywords) {
        return { success: false, error: 'query or keywords are required' }
      }
      if (request.rerank?.enabled && !request.rerank.modelId?.trim()) {
        return { success: false, error: 'rerank.modelId is required when rerank.enabled=true' }
      }
      if (!this.kgRetrievalService) {
        return { success: false, error: 'KGRetrievalService not initialized' }
      }

      this.log.debug('kgRetrievalSearch request', {
        query: request.query?.slice(0, 60) ?? null,
        mode: request.mode ?? null,
        graphTableBase: request.graphTableBase,
        highLevelKeywords: request.highLevelKeywords ?? [],
        lowLevelKeywords: request.lowLevelKeywords ?? [],
        rerankEnabled: Boolean(request.rerank?.enabled),
        rerankModelId: request.rerank?.modelId ?? null,
        rerankTopN: request.rerank?.topN ?? null
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
