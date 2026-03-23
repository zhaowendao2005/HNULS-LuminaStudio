/**
 * KG 检索服务
 *
 * 这里不再处理任何 embedding/model 解析逻辑，职责只保留两件事：
 * 1. 记录请求日志，方便调试 Lumina 侧的检索输入
 * 2. 直接把请求透传给 KnowledgeDatabase Bridge Service
 *
 * 这样 KG 检索就只依赖知识库系统自己的 REST API 和内部配置，
 * Lumina 侧不再绑定固定嵌入模型，避免把“图谱检索”和“模型选择”混在一起。
 */

import { logger } from '@main/services/logger'
import type { KnowledgeDatabaseBridgeService } from '@main/services/knowledge-database-bridge'
import type {
  KGRetrievalSearchRequest,
  KGRetrievalSearchResult
} from '@shared/knowledge-database-api.types'

const log = logger.scope('KGRetrievalService')

export class KGRetrievalService {
  constructor(private readonly bridge: KnowledgeDatabaseBridgeService) {}

  /**
   * 执行 KG 检索。
   *
   * 这里不再从 main 侧拼装 embeddingConfig，也不再读取 KG 固定配置。
   * 上层传进来的请求体会原样发送给知识库系统，真正的图谱/模型解析交给
   * 知识库系统自己的 REST API 来处理。
   */
  async search(request: KGRetrievalSearchRequest): Promise<KGRetrievalSearchResult> {
    log.info('KG retrieval search', {
      query: request.query?.slice(0, 60),
      mode: request.mode,
      graphTableBase: request.graphTableBase,
      rerankEnabled: Boolean(request.rerank?.enabled),
      rerankModelId: request.rerank?.modelId ?? null,
      rerankTopN: request.rerank?.topN ?? null
    })

    const response = await this.bridge.kgRetrievalSearch(request)

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
      durationMs: response.data.meta.durationMs,
      rerankApplied: response.data.meta.rerankApplied
    })

    return response.data
  }
}
