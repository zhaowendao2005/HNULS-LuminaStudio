/**
 * KG 检索服务
 *
 * 负责：
 * 1. 从 knowledgeBaseId 解析 targetNamespace / targetDatabase
 * 2. 从 ModelConfigService 补全 embedding / rerank 的 apiKey / baseUrl
 * 3. 构造完整的 KGRetrievalParams 并调用 KnowledgeDatabaseBridgeService
 */

import { logger } from '@main/services/logger'
import type { KnowledgeDatabaseBridgeService } from '@main/services/knowledge-database-bridge'
import type { ModelConfigService } from '@main/services/model-config'
import type {
  KGRetrievalSearchRequest,
  KGRetrievalSearchResult,
  ExternalApiResponse
} from '@shared/knowledge-database-api.types'

const log = logger.scope('KGRetrievalService')

export class KGRetrievalService {
  constructor(
    private readonly bridge: KnowledgeDatabaseBridgeService,
    private readonly modelConfigService: ModelConfigService
  ) {}

  /**
   * 执行 KG 检索。
   *
   * 流程：
   * 1. 通过 knowledgeBaseId 从 bridge 拿到 targetNamespace / targetDatabase
   * 2. 从 modelConfigService 补全 embedding provider 的 apiKey / baseUrl
   * 3. 如果启用了 rerank，补全 rerank provider 的 apiKey / baseUrl
   * 4. 构造完整参数，调用 bridge.kgRetrievalSearch
   */
  async search(request: KGRetrievalSearchRequest): Promise<KGRetrievalSearchResult> {
    log.info('KG retrieval search', {
      query: request.query?.slice(0, 60),
      mode: request.mode,
      knowledgeBaseId: request.knowledgeBaseId,
      graphTableBase: request.graphTableBase
    })

    // 1. 解析 targetNamespace / targetDatabase
    const graphTables = await this.bridge.getKGGraphTables(request.knowledgeBaseId)
    const { targetNamespace, targetDatabase } = graphTables

    if (!targetNamespace || !targetDatabase) {
      throw new Error(
        `无法解析知识库 ${request.knowledgeBaseId} 的 targetNamespace / targetDatabase`
      )
    }

    // 2. 补全 embedding credentials
    const embeddingProvider = await this.resolveProvider(request.embeddingProviderId)
    const embeddingConfig = {
      providerId: request.embeddingProviderId,
      modelId: request.embeddingModelId,
      baseUrl: embeddingProvider.baseUrl,
      apiKey: embeddingProvider.apiKey,
      dimensions: request.embeddingDimensions,
      headers: embeddingProvider.defaultHeaders
    }

    // 3. 补全 rerank credentials（如果启用）
    let rerankConfig: Record<string, unknown> | undefined
    if (request.rerank?.enabled && request.rerank.providerId) {
      const rerankProvider = await this.resolveProvider(request.rerank.providerId)
      rerankConfig = {
        enabled: true,
        providerId: request.rerank.providerId,
        modelId: request.rerank.modelId,
        baseUrl: rerankProvider.baseUrl,
        apiKey: rerankProvider.apiKey,
        topN: request.rerank.topN,
        headers: rerankProvider.defaultHeaders
      }
    }

    // 4. 构造完整的 KGRetrievalParams（对齐 KnowledgeDatabase 内部格式）
    const fullParams: Record<string, unknown> = {
      query: request.query,
      mode: request.mode,
      targetNamespace,
      targetDatabase,
      graphTableBase: request.graphTableBase,
      embeddingConfig
    }

    // 可选参数
    if (request.keywordExtraction) {
      fullParams.keywordExtraction = request.keywordExtraction
    }
    if (request.vectorSearch) {
      fullParams.vectorSearch = request.vectorSearch
    }
    if (request.graphTraversal) {
      fullParams.graphTraversal = request.graphTraversal
    }
    if (request.chunkTableName) {
      fullParams.chunkTableName = request.chunkTableName
    }
    if (rerankConfig) {
      fullParams.rerank = rerankConfig
    }
    if (request.tokenBudget) {
      fullParams.tokenBudget = request.tokenBudget
    }

    log.debug('KG retrieval full params', {
      mode: fullParams.mode,
      targetNamespace,
      targetDatabase,
      graphTableBase: fullParams.graphTableBase
    })

    // 5. 调用 bridge
    const response: ExternalApiResponse<KGRetrievalSearchResult> =
      await this.bridge.kgRetrievalSearch(fullParams)

    if (!response.success) {
      const errorMsg = response.error?.message || 'KG 检索失败'
      log.error('KG retrieval search failed', { error: errorMsg })
      throw new Error(errorMsg)
    }

    log.info('KG retrieval search completed', {
      mode: response.data.meta.mode,
      entityCount: response.data.meta.entityCount,
      relationCount: response.data.meta.relationCount,
      chunkCount: response.data.meta.chunkCount,
      durationMs: response.data.meta.durationMs
    })

    return response.data
  }

  /**
   * 从 ModelConfigService 解析 provider 的 baseUrl 和 apiKey
   */
  private async resolveProvider(
    providerId: string
  ): Promise<{ baseUrl: string; apiKey: string; defaultHeaders?: Record<string, string> }> {
    const config = await this.modelConfigService.getConfig()
    const provider = config.providers.find((p) => p.id === providerId)

    if (!provider) {
      throw new Error(`Provider 未找到: ${providerId}`)
    }
    if (!provider.baseUrl || !provider.apiKey) {
      throw new Error(`Provider ${providerId} 缺少 baseUrl 或 apiKey`)
    }

    return {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      defaultHeaders: provider.defaultHeaders
    }
  }
}
