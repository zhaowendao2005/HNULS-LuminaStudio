import type { DocumentInfo } from '@shared/knowledge-database-api.types'
import { logger } from '@main/services/logger'
import type { KnowledgeDatabaseBridgeService } from '@main/services/knowledge-database-bridge'
import { createKnowledgeRetrievalError, normalizeKnowledgeRetrievalError } from './errors'
import { collectKnowledgeBaseIdsFromPermissionTree, resolveKnowledgeRetrievalScopes } from './permissions'
import type {
  KnowledgeRetrievalResolveScopesRequest,
  KnowledgeRetrievalResolveScopesResultDto,
  KnowledgeRetrievalSearchRequest,
  KnowledgeRetrievalSearchResultDto
} from './types'

const log = logger.scope('KnowledgeRetrievalService')

export class KnowledgeRetrievalService {
  constructor(private readonly knowledgeDatabaseBridge: KnowledgeDatabaseBridgeService) {}

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
          const documents = await this.knowledgeDatabaseBridge.listAllDocuments({ knowledgeBaseId })
          const selectedFileKeys = this.getSelectedDocumentFileKeys(
            request.selectedDocumentFileKeysByKnowledgeBase,
            knowledgeBaseId
          )
          const scopedDocuments = this.filterDocumentsBySelectedFileKeys(documents, selectedFileKeys)

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

  async search(request: KnowledgeRetrievalSearchRequest): Promise<KnowledgeRetrievalSearchResultDto> {
    if (!Number.isInteger(request.knowledgeBaseId) || request.knowledgeBaseId <= 0) {
      throw createKnowledgeRetrievalError('INVALID_REQUEST', 'knowledgeBaseId 必须是正整数')
    }

    const tableName = request.tableName?.trim()
    if (!tableName) {
      throw createKnowledgeRetrievalError('INVALID_REQUEST', 'tableName 不能为空')
    }

    const queryText = request.queryText?.trim()
    if (!queryText) {
      throw createKnowledgeRetrievalError('INVALID_REQUEST', 'queryText 不能为空')
    }

    const fileKey = this.normalizeOptionalString(request.fileKey)
    const fileKeys = this.normalizeOptionalStringArray(request.fileKeys)
    if (Array.isArray(request.fileKeys) && fileKeys.length === 0) {
      throw createKnowledgeRetrievalError('INVALID_REQUEST', 'fileKeys 不能为空数组')
    }

    const rerankModelId = this.normalizeOptionalString(request.rerankModelId)

    log.debug('search request', {
      knowledgeBaseId: request.knowledgeBaseId,
      tableName,
      queryText,
      fileKey,
      fileKeys,
      k: request.k,
      ef: request.ef,
      rerankModelId,
      rerankTopN: request.rerankTopN
    })

    const response = await this.knowledgeDatabaseBridge.retrievalSearch({
      knowledgeBaseId: request.knowledgeBaseId,
      tableName,
      queryText,
      ...(fileKey ? { fileKey } : {}),
      ...(fileKeys ? { fileKeys } : {}),
      ...(request.k !== undefined ? { k: request.k } : {}),
      ...(request.ef !== undefined ? { ef: request.ef } : {}),
      ...(rerankModelId ? { rerankModelId } : {}),
      ...(request.rerankTopN !== undefined ? { rerankTopN: request.rerankTopN } : {})
    })

    if (!response.success) {
      throw normalizeKnowledgeRetrievalError(response, 'UPSTREAM_HTTP_ERROR', {
        knowledgeBaseId: request.knowledgeBaseId,
        tableName
      })
    }

    return {
      hits: response.data
    }
  }

  private resolveTargetKnowledgeBaseIds(params: {
    knowledgeBaseId?: number | null
    knowledgeBaseIds?: number[] | null
    selectedKnowledgeBaseIds?: number[] | null
    selectedDocumentFileKeysByKnowledgeBase?: Record<number, string[]>
    permissionTree?: KnowledgeRetrievalResolveScopesRequest['permissionTree']
  }): number[] {
    const ids = new Set<number>()
    const append = (value: unknown): void => {
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        ids.add(value)
      }
    }

    for (const value of params.knowledgeBaseIds ?? []) append(value)
    for (const value of params.selectedKnowledgeBaseIds ?? []) append(value)
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
      if (typeof value !== 'string') continue
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

  private normalizeOptionalString(value: string | null | undefined): string | undefined {
    const normalized = value?.trim()
    return normalized ? normalized : undefined
  }

  private normalizeOptionalStringArray(value: string[] | undefined): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined
    }

    const normalized = [...new Set(value.map((item) => item.trim()).filter(Boolean))]
    return normalized.length > 0 ? normalized : []
  }
}
