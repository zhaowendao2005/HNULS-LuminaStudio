import type { KnowledgeDatabaseBridgeService } from '@main/services/knowledge-database-bridge'
import { createKnowledgeRetrievalError, normalizeKnowledgeRetrievalError } from './errors'
import {
  executeKnowledgeRetrievalSearch,
  limitKnowledgeRetrievalHits,
  normalizeRetrievalExecutionParams,
  sortKnowledgeRetrievalHits
} from './executor'
import {
  collectKnowledgeBaseIdsFromPermissionTree,
  resolveKnowledgeRetrievalScopes
} from './permissions'
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
    const knowledgeBaseIds = this.resolveTargetKnowledgeBaseIds(request)

    try {
      const scopeResults = await Promise.all(
        knowledgeBaseIds.map(async (knowledgeBaseId) => {
          const documents = await this.knowledgeDatabaseBridge.listAllDocuments({
            knowledgeBaseId
          })

          return resolveKnowledgeRetrievalScopes({
            knowledgeBaseId,
            documents,
            permissionTree: request.permissionTree
          })
        })
      )

      return {
        knowledgeBaseId: knowledgeBaseIds[0] ?? null,
        knowledgeBaseIds,
        resolvedScopes: scopeResults.flatMap((item) => item.resolvedScopes),
        warnings: scopeResults.flatMap((item) => item.warnings)
      }
    } catch (error) {
      throw normalizeKnowledgeRetrievalError(error, 'KNOWLEDGE_BASE_LOAD_FAILED', {
        knowledgeBaseIds
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
    const knowledgeBaseIds = this.resolveTargetKnowledgeBaseIds(request)

    const scopeResult = await this.resolveScopes({
      knowledgeBaseIds,
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
        knowledgeBaseId: knowledgeBaseIds[0] ?? null,
        knowledgeBaseIds,
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

    const sortedHits = sortKnowledgeRetrievalHits(
      scopeResults.flatMap((scopeResultItem) => scopeResultItem.hits),
      {
        useRerank: Boolean(executionParams.rerankModelId)
      }
    )
    const limitedResults = limitKnowledgeRetrievalHits({
      hits: sortedHits,
      scopeResults,
      useRerank: Boolean(executionParams.rerankModelId),
      rerankTopN: executionParams.rerankTopN
    })
    const errors = scopeResults.flatMap((scopeResultItem) =>
      scopeResultItem.error ? [scopeResultItem.error] : []
    )

    return {
      query: request.query,
      knowledgeBaseId: knowledgeBaseIds[0] ?? null,
      knowledgeBaseIds,
      k: executionParams.k,
      ef: executionParams.ef,
      rerankModelId: executionParams.rerankModelId,
      rerankTopN: executionParams.rerankTopN,
      resolvedScopes: scopeResult.resolvedScopes,
      scopeResults: limitedResults.scopeResults,
      hits: limitedResults.hits,
      warnings: scopeResult.warnings,
      errors
    }
  }

  private resolveTargetKnowledgeBaseIds(params: {
    knowledgeBaseId?: number | null
    knowledgeBaseIds?: number[] | null
    permissionTree?: KnowledgeRetrievalSearchRequest['permissionTree']
  }): number[] {
    const ids = new Set<number>()
    const append = (value: unknown): void => {
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        ids.add(value)
      }
    }

    for (const value of params.knowledgeBaseIds ?? []) {
      append(value)
    }
    append(params.knowledgeBaseId)

    for (const value of collectKnowledgeBaseIdsFromPermissionTree(params.permissionTree)) {
      append(value)
    }

    const result = [...ids]
    if (result.length === 0) {
      throw createKnowledgeRetrievalError(
        'INVALID_REQUEST',
        'knowledgeBaseId / knowledgeBaseIds 至少需要提供一个正整数'
      )
    }

    return result
  }
}
