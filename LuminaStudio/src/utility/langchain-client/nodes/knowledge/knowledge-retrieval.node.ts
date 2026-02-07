/**
 * ======================================================================
 * 知识库检索节点 - 核心业务逻辑
 * ======================================================================
 *
 * 🎯 职责:
 * 负责从知识库 API 检索与用户问题相关的文档片段
 * - 接收: 查询关键词 + 检索配置 (选择的文档/嵌入版本)
 * - 输出: JSON 格式的检索结果（包含 hits、错误信息等）
 *
 * 🏗️ 架构:
 * 这是一个纯业务逻辑函数 runKnowledgeRetrieval()
 * - Tool 层调用它
 * - 返回 JSON 字符串（不是对象），方便 LLM 理解
 *
 * 📡 流程:
 * 1. 验证检索配置（是否选择了嵌入表）
 * 2. 计算 K 值（每个嵌入表返回的结果数）
 * 3. 并行/顺序调用 API 进行检索
 * 4. 处理 API 错误
 * 5. 返回结构化的 JSON 结果
 *
 * 💡 设计亮点:
 * - 支持多范围检索（多个嵌入表）
 * - 支持 reranking（结果重排）
 * - 返回结果摘要（避免消息过大）
 * - 详细的日志记录
 */
import { logger } from '@main/services/logger'
import type { LangchainClientRetrievalConfig } from '@shared/langchain-client.types'

const log = logger.scope('LangchainClient.Node.KnowledgeRetrieval')

interface ApiErrorInfo {
  code?: string
  message?: string
  details?: unknown
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiErrorInfo | string
}

export interface RetrievalHit {
  id: string
  content: string
  chunk_index?: number
  file_key?: string
  file_name?: string
  distance?: number
  rerank_score?: number
}

interface KnowledgeSearchResultScope {
  knowledgeBaseId: number
  tableName: string
  fileKeysCount: number
  hits?: RetrievalHit[]
  error?: string
}

interface KnowledgeSearchResult {
  query: string
  totalScopes: number
  scopes: KnowledgeSearchResultScope[]
}

/**
 * 知识库检索节点（核心逻辑）
 *
 * 该函数承载检索的所有业务逻辑。
 * tool 层只负责调用它并包装为 LangChain Tool。
 */
export async function runKnowledgeRetrieval(params: {
  apiBaseUrl: string
  query: string
  retrieval?: LangchainClientRetrievalConfig
}): Promise<string> {
  const apiBaseUrl = params.apiBaseUrl.trim().replace(/\/$/, '')
  const url = `${apiBaseUrl}/api/v1/retrieval/search`

  const retrieval = params.retrieval
  const scopes = retrieval?.scopes ?? []

  if (!retrieval || scopes.length === 0) {
    const emptyResult: KnowledgeSearchResult = {
      query: params.query,
      totalScopes: 0,
      scopes: [
        {
          knowledgeBaseId: 0,
          tableName: '',
          fileKeysCount: 0,
          error: '未选择检索范围：请在左侧 SourcesTab 选择文档/嵌入版本后再试'
        }
      ]
    }
    return JSON.stringify(emptyResult)
  }

  const totalK = retrieval.k ?? 3
  const perScopeK = Math.min(3, Math.max(1, Math.floor(totalK / scopes.length)))

  log.info('Retrieval search start', {
    scopeCount: scopes.length,
    totalK,
    perScopeK,
    ef: retrieval.ef ?? null,
    rerankModelId: retrieval.rerankModelId ?? null,
    rerankTopN: retrieval.rerankTopN ?? null
  })

  const resultScopes: KnowledgeSearchResultScope[] = []

  for (const scope of scopes) {
    const body = {
      knowledgeBaseId: scope.knowledgeBaseId,
      tableName: scope.tableName,
      queryText: params.query,
      fileKeys: scope.fileKeys,
      k: perScopeK,
      ef: retrieval.ef,
      rerankModelId: retrieval.rerankModelId,
      rerankTopN: retrieval.rerankTopN
    }

    log.info('Retrieval search request', {
      knowledgeBaseId: scope.knowledgeBaseId,
      tableName: scope.tableName,
      fileKeysCount: scope.fileKeys?.length ?? 0,
      k: perScopeK,
      ef: retrieval.ef ?? null
    })

    let resp: any
    try {
      resp = await globalThis.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      resultScopes.push({
        knowledgeBaseId: scope.knowledgeBaseId,
        tableName: scope.tableName,
        fileKeysCount: scope.fileKeys?.length ?? 0,
        error: `请求失败: ${msg}`
      })
      continue
    }

    let json: ApiResponse<RetrievalHit[]> | null = null
    try {
      json = (await resp.json()) as ApiResponse<RetrievalHit[]>
    } catch {
      // ignore parse error, handle below
    }

    if (!resp.ok || !json?.success) {
      const msg =
        (json && typeof json.error === 'object' && json.error?.message) ||
        (json && typeof json.error === 'string' && json.error) ||
        `HTTP_${resp.status}`
      resultScopes.push({
        knowledgeBaseId: scope.knowledgeBaseId,
        tableName: scope.tableName,
        fileKeysCount: scope.fileKeys?.length ?? 0,
        error: `检索失败: ${msg}`
      })
      continue
    }

    const hits = (json.data ?? []) as RetrievalHit[]
    // 截断每个 hit 的 content，避免消息过大（最多保留 500 字符）
    const truncatedHits = hits.map((hit) => ({
      ...hit,
      content: hit.content.length > 500 ? hit.content.slice(0, 500) + '...' : hit.content
    }))
    resultScopes.push({
      knowledgeBaseId: scope.knowledgeBaseId,
      tableName: scope.tableName,
      fileKeysCount: scope.fileKeys?.length ?? 0,
      hits: truncatedHits
    })
  }

  const result: KnowledgeSearchResult = {
    query: params.query,
    totalScopes: scopes.length,
    scopes: resultScopes
  }

  return JSON.stringify(result)
}
