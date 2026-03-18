import type { KnowledgeDatabaseBridgeService } from '@main/services/knowledge-database-bridge'
import { createKnowledgeRetrievalError, normalizeKnowledgeRetrievalError } from './errors'
import { executeKnowledgeRetrievalSearch, normalizeRetrievalExecutionParams } from './executor'
import { resolveKnowledgeRetrievalScopes } from './permissions'
import type {
  KnowledgeRetrievalResolveScopesRequest,
  KnowledgeRetrievalResolveScopesResultDto,
  KnowledgeRetrievalSearchRequest,
  KnowledgeRetrievalSearchResultDto
} from './types'

/**
 * OrchestraFlow knowledge-retrieval 节点的主进程服务。
 *
 * 这里只做三件事：
 * 1. 从知识库桥接层拉取文档与 embeddings 真相。
 * 2. 按 permission tree 解析出最终 scope。
 * 3. 用标准 DTO 执行并返回检索结果。
 */
export class KnowledgeRetrievalService {
  constructor(private readonly knowledgeDatabaseBridge: KnowledgeDatabaseBridgeService) {}

  /**
   * 解析 permission tree，返回标准化 scope DTO。
   */
  async resolveScopes(
    request: KnowledgeRetrievalResolveScopesRequest
  ): Promise<KnowledgeRetrievalResolveScopesResultDto> {
    this.validateKnowledgeBaseId(request.knowledgeBaseId)

    try {
      const documents = await this.knowledgeDatabaseBridge.listAllDocuments({
        knowledgeBaseId: request.knowledgeBaseId
      })

      return resolveKnowledgeRetrievalScopes({
        knowledgeBaseId: request.knowledgeBaseId,
        documents,
        permissionTree: request.permissionTree
      })
    } catch (error) {
      throw normalizeKnowledgeRetrievalError(error, 'KNOWLEDGE_BASE_LOAD_FAILED', {
        knowledgeBaseId: request.knowledgeBaseId
      })
    }
  }

  /**
   * 主检索入口。
   *
   * 后续 private RPC 只需要透传这个方法的入参与返回值即可。
   */
  async search(
    request: KnowledgeRetrievalSearchRequest
  ): Promise<KnowledgeRetrievalSearchResultDto> {
    if (!request.query?.trim()) {
      throw createKnowledgeRetrievalError('INVALID_REQUEST', 'query 不能为空')
    }

    const scopeResult = await this.resolveScopes({
      knowledgeBaseId: request.knowledgeBaseId,
      permissionTree: request.permissionTree
    })

    const executionParams = normalizeRetrievalExecutionParams({
      k: request.k,
      ef: request.ef,
      rerank: request.rerank
    })

    if (scopeResult.resolvedScopes.length === 0) {
      return {
        query: request.query,
        knowledgeBaseId: request.knowledgeBaseId,
        k: executionParams.k,
        ef: executionParams.ef,
        rerankModelId: executionParams.rerankModelId,
        rerankTopN: executionParams.rerankTopN,
        resolvedScopes: [],
        scopeResults: [],
        hits: [],
        warnings: scopeResult.warnings,
        errors: []
      }
    }

    const scopeResults = await executeKnowledgeRetrievalSearch({
      apiBaseUrl: this.knowledgeDatabaseBridge.getBaseUrl(),
      query: request.query,
      scopes: scopeResult.resolvedScopes,
      k: executionParams.k,
      ef: executionParams.ef,
      rerankModelId: executionParams.rerankModelId,
      rerankTopN: executionParams.rerankTopN,
      abortSignal: request.abortSignal
    })

    const hits = scopeResults.flatMap((scopeResultItem) => scopeResultItem.hits)
    const errors = scopeResults.flatMap((scopeResultItem) =>
      scopeResultItem.error ? [scopeResultItem.error] : []
    )

    return {
      query: request.query,
      knowledgeBaseId: request.knowledgeBaseId,
      k: executionParams.k,
      ef: executionParams.ef,
      rerankModelId: executionParams.rerankModelId,
      rerankTopN: executionParams.rerankTopN,
      resolvedScopes: scopeResult.resolvedScopes,
      scopeResults,
      hits,
      warnings: scopeResult.warnings,
      errors
    }
  }

  private validateKnowledgeBaseId(knowledgeBaseId: number): void {
    if (!Number.isInteger(knowledgeBaseId) || knowledgeBaseId <= 0) {
      throw createKnowledgeRetrievalError('INVALID_REQUEST', 'knowledgeBaseId 必须是正整数', {
        knowledgeBaseId
      })
    }
  }
}
