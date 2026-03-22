import type { DocumentInfo } from '@shared/knowledge-database-api.types'
import { logger } from '@main/services/logger'
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

const log = logger.scope('KnowledgeRetrievalService')

/**
 * OrchestraFlow knowledge-retrieval 节点的主进程服务。
 *
 * 当前版本的职责拆分为：
 * 1. 从知识库 REST client 拉取文档与 embeddings 真相。
 * 2. 按 permission tree 和显式 selection 解析出最终 scope。
 * 3. 按真实 `/api/v1/retrieval/search` 契约执行检索。
 * 4. 把上游结果稳定映射成节点消费 DTO。
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
    log.debug('resolveScopes request', {
      knowledgeBaseIds,
      selectedKnowledgeBaseIds: request.selectedKnowledgeBaseIds ?? [],
      selectedDocumentFileKeysByKnowledgeBase: request.selectedDocumentFileKeysByKnowledgeBase ?? {}
    })

    try {
      const scopeResults = await Promise.all(
        knowledgeBaseIds.map(async (knowledgeBaseId) => {
          const documents = await this.knowledgeDatabaseBridge.listAllDocuments({
            knowledgeBaseId
          })
          const selectedFileKeys = this.getSelectedDocumentFileKeys(
            request.selectedDocumentFileKeysByKnowledgeBase,
            knowledgeBaseId
          )
          const scopedDocuments = this.filterDocumentsBySelectedFileKeys(
            documents,
            selectedFileKeys
          )

          return resolveKnowledgeRetrievalScopes({
            knowledgeBaseId,
            documents: scopedDocuments,
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
   */
  async search(
    request: KnowledgeRetrievalSearchRequest
  ): Promise<KnowledgeRetrievalSearchResultDto> {
    if (!request.query?.trim()) {
      throw createKnowledgeRetrievalError('INVALID_REQUEST', 'query 不能为空')
    }

    log.debug('search request', {
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

    const knowledgeBaseIds = this.resolveTargetKnowledgeBaseIds(request)
    const scopeResult = await this.resolveScopes({
      knowledgeBaseIds,
      selectedKnowledgeBaseIds: request.selectedKnowledgeBaseIds,
      selectedDocumentFileKeysByKnowledgeBase: request.selectedDocumentFileKeysByKnowledgeBase,
      permissionTree: request.permissionTree
    })

    log.debug('resolveScopes result', {
      resolvedScopes: scopeResult.resolvedScopes.length,
      warnings: scopeResult.warnings.length
    })

    const executionParams = normalizeRetrievalExecutionParams({
      k: request.k,
      ef: request.ef,
      rerank: request.rerank
    })

    if (scopeResult.resolvedScopes.length === 0) {
      throw new Error('知识检索未找到可检索的内容')
    }

    const scopeResults = await executeKnowledgeRetrievalSearch({
      bridge: this.knowledgeDatabaseBridge,
      query: request.query,
      scopes: scopeResult.resolvedScopes,
      k: executionParams.k,
      ef: executionParams.ef,
      rerankModelId: executionParams.rerankModelId,
      rerankTopN: executionParams.rerankTopN
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
    log.debug('search result', {
      resolvedScopes: scopeResult.resolvedScopes.length,
      hits: limitedResults.hits.length,
      partialFailures: errors.length
    })

    if (limitedResults.hits.length === 0) {
      throw new Error('知识检索未召回任何内容')
    }

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
    selectedKnowledgeBaseIds?: number[] | null
    selectedDocumentFileKeysByKnowledgeBase?: Record<number, string[]>
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
    for (const value of params.selectedKnowledgeBaseIds ?? []) {
      append(value)
    }
    append(params.knowledgeBaseId)

    for (const key of Object.keys(params.selectedDocumentFileKeysByKnowledgeBase || {})) {
      append(Number(key))
    }

    for (const value of collectKnowledgeBaseIdsFromPermissionTree(params.permissionTree)) {
      append(value)
    }

    const result = [...ids]
    if (result.length === 0) {
      throw new Error('knowledgeBaseId / knowledgeBaseIds 至少需要提供一个正整数')
    }

    return result
  }

  private getSelectedDocumentFileKeys(
    selectedDocumentFileKeysByKnowledgeBase: Record<number, string[]> | undefined,
    knowledgeBaseId: number
  ): string[] {
    const rawFileKeys = selectedDocumentFileKeysByKnowledgeBase?.[knowledgeBaseId]
    if (!Array.isArray(rawFileKeys) || rawFileKeys.length === 0) {
      return []
    }

    const fileKeys = new Set<string>()
    for (const value of rawFileKeys) {
      if (typeof value !== 'string') {
        continue
      }
      const normalized = value.trim()
      if (normalized) {
        fileKeys.add(normalized)
      }
    }

    return [...fileKeys]
  }

  private filterDocumentsBySelectedFileKeys(
    documents: DocumentInfo[],
    selectedFileKeys: string[]
  ): DocumentInfo[] {
    if (selectedFileKeys.length === 0) {
      return documents
    }

    const allowedFileKeys = new Set(selectedFileKeys)
    return documents.filter((document) => allowedFileKeys.has(document.fileKey))
  }
}
