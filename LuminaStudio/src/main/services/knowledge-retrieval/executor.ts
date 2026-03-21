import type { ExternalApiResponse, RetrievalHit } from '@shared/knowledge-database-api.types'
import type { KnowledgeDatabaseBridgeService } from '@main/services/knowledge-database-bridge'
import { createKnowledgeRetrievalError } from './errors'
import type {
  KnowledgeRetrievalErrorDto,
  KnowledgeRetrievalHitDto,
  KnowledgeRetrievalResolvedScopeDto,
  KnowledgeRetrievalScopeResultDto
} from './types'

interface KnowledgeRetrievalScopeGroup {
  knowledgeBaseId: number
  tableName: string
  fileKeys: string[]
  scopes: KnowledgeRetrievalResolvedScopeDto[]
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

function buildScopeKey(scope: KnowledgeRetrievalResolvedScopeDto): string {
  return `${scope.knowledgeBaseId}::${scope.tableName}::${scope.fileKey}`
}

function buildScopeGroupKey(scope: KnowledgeRetrievalResolvedScopeDto): string {
  return `${scope.knowledgeBaseId}::${scope.tableName}`
}

function groupScopesByRequest(
  scopes: KnowledgeRetrievalResolvedScopeDto[]
): KnowledgeRetrievalScopeGroup[] {
  const groups = new Map<string, KnowledgeRetrievalScopeGroup>()

  for (const scope of scopes) {
    const groupKey = buildScopeGroupKey(scope)
    const matchedGroup = groups.get(groupKey)
    if (matchedGroup) {
      matchedGroup.scopes.push(scope)
      if (!matchedGroup.fileKeys.includes(scope.fileKey)) {
        matchedGroup.fileKeys.push(scope.fileKey)
      }
      continue
    }

    groups.set(groupKey, {
      knowledgeBaseId: scope.knowledgeBaseId,
      tableName: scope.tableName,
      fileKeys: [scope.fileKey],
      scopes: [scope]
    })
  }

  return [...groups.values()]
}

function compareNullableNumberAsc(left?: number, right?: number): number {
  if (left === undefined && right === undefined) {
    return 0
  }
  if (left === undefined) {
    return 1
  }
  if (right === undefined) {
    return -1
  }
  return left - right
}

function compareNullableNumberDesc(left?: number, right?: number): number {
  if (left === undefined && right === undefined) {
    return 0
  }
  if (left === undefined) {
    return 1
  }
  if (right === undefined) {
    return -1
  }
  return right - left
}

function isNoRecallResultsResponse(response: ExternalApiResponse<unknown>): boolean {
  return (
    !response.success &&
    response.error.code === 'RETRIEVAL_FAILED' &&
    /no recall results/i.test(response.error.message || '')
  )
}

function mapUpstreamErrorToRetrievalError(
  response: ExternalApiResponse<unknown>,
  details?: Record<string, unknown>
): KnowledgeRetrievalErrorDto {
  if (response.success) {
    return createKnowledgeRetrievalError(
      'UPSTREAM_RESPONSE_INVALID',
      '知识检索接口返回了无效响应',
      details
    )
  }

  const code =
    response.error.code === 'NETWORK_ERROR' || response.error.code === 'TIMEOUT'
      ? 'NETWORK_ERROR'
      : response.error.code === 'INVALID_RESPONSE'
        ? 'UPSTREAM_RESPONSE_INVALID'
        : 'UPSTREAM_HTTP_ERROR'

  return createKnowledgeRetrievalError(code, response.error.message || '知识检索接口请求失败', {
    ...details,
    upstreamCode: response.error.code,
    upstreamDetails: response.error.details
  })
}

export function sortKnowledgeRetrievalHits(
  hits: KnowledgeRetrievalHitDto[],
  params: {
    useRerank: boolean
  }
): KnowledgeRetrievalHitDto[] {
  return [...hits].sort((left, right) => {
    if (params.useRerank) {
      const rerankOrder = compareNullableNumberDesc(left.rerankScore, right.rerankScore)
      if (rerankOrder !== 0) {
        return rerankOrder
      }
    }

    const distanceOrder = compareNullableNumberAsc(left.distance, right.distance)
    if (distanceOrder !== 0) {
      return distanceOrder
    }

    if (left.scope.knowledgeBaseId !== right.scope.knowledgeBaseId) {
      return left.scope.knowledgeBaseId - right.scope.knowledgeBaseId
    }
    if (left.fileKey !== right.fileKey) {
      return left.fileKey.localeCompare(right.fileKey)
    }

    const chunkIndexOrder = compareNullableNumberAsc(left.chunkIndex, right.chunkIndex)
    if (chunkIndexOrder !== 0) {
      return chunkIndexOrder
    }

    return left.id.localeCompare(right.id)
  })
}

export function limitKnowledgeRetrievalHits(params: {
  hits: KnowledgeRetrievalHitDto[]
  scopeResults: KnowledgeRetrievalScopeResultDto[]
  useRerank: boolean
  rerankTopN?: number
}): {
  hits: KnowledgeRetrievalHitDto[]
  scopeResults: KnowledgeRetrievalScopeResultDto[]
} {
  if (!params.useRerank || params.rerankTopN === undefined) {
    return {
      hits: params.hits,
      scopeResults: params.scopeResults
    }
  }

  const limitedHits = params.hits.slice(0, params.rerankTopN)
  const allowedHits = new Set(limitedHits)

  return {
    hits: limitedHits,
    scopeResults: params.scopeResults.map((scopeResult) => ({
      ...scopeResult,
      hits: scopeResult.hits.filter((hit) => allowedHits.has(hit))
    }))
  }
}

function buildScopeErrorResults(
  scopes: KnowledgeRetrievalResolvedScopeDto[],
  error: KnowledgeRetrievalErrorDto
): KnowledgeRetrievalScopeResultDto[] {
  return scopes.map((scope) => ({
    scope,
    hits: [],
    error
  }))
}

function buildScopeResultsFromHits(params: {
  group: KnowledgeRetrievalScopeGroup
  hits: RetrievalHit[]
}): KnowledgeRetrievalScopeResultDto[] {
  const scopeByFileKey = new Map(
    params.group.scopes.map((scope) => [scope.fileKey, scope] as const)
  )
  const hitsByScopeKey = new Map<string, KnowledgeRetrievalHitDto[]>()

  for (const scope of params.group.scopes) {
    hitsByScopeKey.set(buildScopeKey(scope), [])
  }

  for (const hit of params.hits) {
    const matchedScope =
      (hit.file_key ? scopeByFileKey.get(hit.file_key) : undefined) ?? params.group.scopes[0]

    // 中文注释：上游偶尔可能不回 file_key，这里退回当前分组的首个 scope，保证结果结构稳定。
    const normalizedHit: KnowledgeRetrievalHitDto = {
      id: hit.id,
      content: hit.content,
      chunkIndex: hit.chunk_index,
      fileKey: hit.file_key || matchedScope.fileKey,
      fileName: hit.file_name || matchedScope.fileName,
      distance: hit.distance,
      rerankScore: hit.rerank_score,
      scope: matchedScope
    }

    const scopeKey = buildScopeKey(matchedScope)
    hitsByScopeKey.get(scopeKey)?.push(normalizedHit)
  }

  return params.group.scopes.map((scope) => ({
    scope,
    hits: hitsByScopeKey.get(buildScopeKey(scope)) ?? []
  }))
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
  // 中文注释：这里取 5 是为了与知识检索节点编辑器默认值保持一致，
  // 避免 node 配置缺失时退回到与 UI 不同的隐藏默认值。
  const k = assertPositiveInteger('k', params.k, 5)
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

  return {
    k,
    ef,
    rerankModelId,
    rerankTopN
  }
}

async function searchScopeGroup(params: {
  bridge: KnowledgeDatabaseBridgeService
  query: string
  group: KnowledgeRetrievalScopeGroup
  k: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
}): Promise<KnowledgeRetrievalScopeResultDto[]> {
  const response = await params.bridge.retrievalSearch({
    knowledgeBaseId: params.group.knowledgeBaseId,
    tableName: params.group.tableName,
    queryText: params.query,
    // 中文注释：把同知识库 + 同 embedding 表的 fileKey 合并成一次请求，
    // 让知识库后端可以在同一批候选上完成召回和可选 rerank。
    fileKeys: params.group.fileKeys,
    k: params.k,
    ef: params.ef,
    rerankModelId: params.rerankModelId,
    rerankTopN: params.rerankTopN
  })

  if (!response.success) {
    if (isNoRecallResultsResponse(response)) {
      return buildScopeResultsFromHits({
        group: params.group,
        hits: []
      })
    }

    return buildScopeErrorResults(
      params.group.scopes,
      mapUpstreamErrorToRetrievalError(response, {
        knowledgeBaseId: params.group.knowledgeBaseId,
        tableName: params.group.tableName,
        fileKeys: params.group.fileKeys
      })
    )
  }

  return buildScopeResultsFromHits({
    group: params.group,
    hits: Array.isArray(response.data) ? response.data : []
  })
}

/**
 * 并发执行多个 scope 检索。
 */
export async function executeKnowledgeRetrievalSearch(params: {
  bridge: KnowledgeDatabaseBridgeService
  query: string
  scopes: KnowledgeRetrievalResolvedScopeDto[]
  k: number
  ef?: number
  rerankModelId?: string
  rerankTopN?: number
}): Promise<KnowledgeRetrievalScopeResultDto[]> {
  const groupedScopes = groupScopesByRequest(params.scopes)
  const groupedResults = await Promise.all(
    groupedScopes.map(async (group) => {
      return await searchScopeGroup({
        bridge: params.bridge,
        query: params.query,
        group,
        k: params.k,
        ef: params.ef,
        rerankModelId: params.rerankModelId,
        rerankTopN: params.rerankTopN
      })
    })
  )

  const scopeResultMap = new Map<string, KnowledgeRetrievalScopeResultDto>()
  for (const results of groupedResults) {
    for (const result of results) {
      scopeResultMap.set(buildScopeKey(result.scope), result)
    }
  }

  return params.scopes.map((scope) => {
    return (
      scopeResultMap.get(buildScopeKey(scope)) ?? {
        scope,
        hits: []
      }
    )
  })
}
