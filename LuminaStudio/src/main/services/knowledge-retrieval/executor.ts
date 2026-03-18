import type { ExternalApiResponse } from '@shared/knowledge-database-api.types'
import { createKnowledgeRetrievalError, normalizeKnowledgeRetrievalError } from './errors'
import type {
  KnowledgeRetrievalErrorDto,
  KnowledgeRetrievalHitDto,
  KnowledgeRetrievalResolvedScopeDto,
  KnowledgeRetrievalScopeResultDto
} from './types'

interface UpstreamRetrievalHit {
  id: string
  content: string
  chunk_index?: number
  file_key?: string
  file_name?: string
  distance?: number
  rerank_score?: number
}

function assertPositiveInteger(
  name: string,
  value: number | undefined,
  defaultValue: number
): number {
  const finalValue = value ?? defaultValue
  if (!Number.isInteger(finalValue) || finalValue <= 0) {
    throw createKnowledgeRetrievalError('INVALID_REQUEST', `${name} 必须是正整数`, {
      [name]: finalValue
    })
  }
  return finalValue
}

/**
 * 校验 rerank 参数，避免把不完整或自相矛盾的配置传给上游。
 */
export function normalizeRetrievalExecutionParams(params: {
  k?: number
  ef?: number
  rerank?: {
    modelId?: string | null
    topN?: number | null
  }
}): {
  k: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
} {
  const k = assertPositiveInteger('k', params.k, 3)
  const ef = params.ef === undefined ? undefined : assertPositiveInteger('ef', params.ef, params.ef)
  const rerankModelId = params.rerank?.modelId?.trim() || undefined
  const rerankTopN =
    params.rerank?.topN === undefined || params.rerank?.topN === null
      ? undefined
      : assertPositiveInteger('rerank.topN', params.rerank.topN, params.rerank.topN)

  if (rerankTopN !== undefined && !rerankModelId) {
    throw createKnowledgeRetrievalError(
      'INVALID_RERANK_CONFIG',
      '配置了 rerank.topN 但缺少 rerank.modelId',
      {
        rerankTopN
      }
    )
  }

  if (rerankTopN !== undefined && rerankTopN < k) {
    throw createKnowledgeRetrievalError(
      'INVALID_RERANK_CONFIG',
      'rerank.topN 不能小于 k，否则会在重排前截断召回结果',
      {
        k,
        rerankTopN
      }
    )
  }

  return {
    k,
    ef,
    rerankModelId,
    rerankTopN
  }
}

async function searchSingleScope(params: {
  apiBaseUrl: string
  query: string
  scope: KnowledgeRetrievalResolvedScopeDto
  k: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
  abortSignal?: AbortSignal
}): Promise<KnowledgeRetrievalScopeResultDto> {
  const url = `${params.apiBaseUrl.replace(/\/$/, '')}/api/v1/retrieval/search`

  try {
    const response = await globalThis.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        knowledgeBaseId: params.scope.knowledgeBaseId,
        tableName: params.scope.tableName,
        queryText: params.query,
        fileKeys: [params.scope.fileKey],
        k: params.k,
        ef: params.ef,
        rerankModelId: params.rerankModelId,
        rerankTopN: params.rerankTopN
      }),
      signal: params.abortSignal
    })

    let payload: ExternalApiResponse<UpstreamRetrievalHit[]> | null = null
    try {
      payload = (await response.json()) as ExternalApiResponse<UpstreamRetrievalHit[]>
    } catch {
      payload = null
    }

    if (!response.ok || !payload?.success) {
      const error: KnowledgeRetrievalErrorDto = payload?.success
        ? createKnowledgeRetrievalError('UPSTREAM_RESPONSE_INVALID', '知识检索接口返回了无效响应', {
            tableName: params.scope.tableName,
            fileKey: params.scope.fileKey
          })
        : createKnowledgeRetrievalError(
            payload?.error?.code === 'NETWORK_ERROR' ? 'NETWORK_ERROR' : 'UPSTREAM_HTTP_ERROR',
            payload?.error?.message || `知识检索接口请求失败: HTTP_${response.status}`,
            {
              httpStatus: response.status,
              fileKey: params.scope.fileKey,
              tableName: params.scope.tableName,
              upstreamCode: payload?.success ? undefined : payload?.error.code,
              upstreamDetails: payload?.success ? undefined : payload?.error.details
            }
          )

      return {
        scope: params.scope,
        hits: [],
        error
      }
    }

    const hits: KnowledgeRetrievalHitDto[] = (payload.data ?? []).map((hit) => ({
      id: hit.id,
      content: hit.content,
      chunkIndex: hit.chunk_index,
      fileKey: hit.file_key || params.scope.fileKey,
      fileName: hit.file_name || params.scope.fileName,
      distance: hit.distance,
      rerankScore: hit.rerank_score,
      scope: params.scope
    }))

    return {
      scope: params.scope,
      hits
    }
  } catch (error) {
    return {
      scope: params.scope,
      hits: [],
      error: normalizeKnowledgeRetrievalError(error, 'NETWORK_ERROR', {
        fileKey: params.scope.fileKey,
        tableName: params.scope.tableName
      })
    }
  }
}

/**
 * 并发执行多个 scope 检索。
 */
export async function executeKnowledgeRetrievalSearch(params: {
  apiBaseUrl: string
  query: string
  scopes: KnowledgeRetrievalResolvedScopeDto[]
  k: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
  abortSignal?: AbortSignal
}): Promise<KnowledgeRetrievalScopeResultDto[]> {
  return await Promise.all(
    params.scopes.map(
      async (scope) =>
        await searchSingleScope({
          apiBaseUrl: params.apiBaseUrl,
          query: params.query,
          scope,
          k: params.k,
          ef: params.ef,
          rerankModelId: params.rerankModelId,
          rerankTopN: params.rerankTopN,
          abortSignal: params.abortSignal
        })
    )
  )
}
