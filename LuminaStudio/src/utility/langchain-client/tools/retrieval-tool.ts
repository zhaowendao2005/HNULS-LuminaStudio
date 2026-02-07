import { tool } from 'langchain'
import { z } from 'zod'
import { logger } from '@main/services/logger'
import type { LangchainClientRetrievalConfig } from '@shared/langchain-client.types'

const log = logger.scope('LangchainClient.Tool.knowledge_search')

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

export function createKnowledgeSearchTool(params: {
  apiBaseUrl: string
  getRetrievalConfig: () => LangchainClientRetrievalConfig | undefined
}) {
  const apiBaseUrl = params.apiBaseUrl.trim().replace(/\/$/, '')

  return tool(
    async ({ query }: { query: string }) => {
      const url = `${apiBaseUrl}/api/v1/retrieval/search`

      const retrieval = params.getRetrievalConfig()
      const scopes = retrieval?.scopes ?? []

      if (!retrieval || scopes.length === 0) {
        const emptyResult: KnowledgeSearchResult = {
          query,
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

      const totalK = retrieval.k ?? 10
      const perScopeK = Math.max(1, Math.floor(totalK / scopes.length))

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
          queryText: query,
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
        resultScopes.push({
          knowledgeBaseId: scope.knowledgeBaseId,
          tableName: scope.tableName,
          fileKeysCount: scope.fileKeys?.length ?? 0,
          hits
        })
      }

      const result: KnowledgeSearchResult = {
        query,
        totalScopes: scopes.length,
        scopes: resultScopes
      }

      return JSON.stringify(result)
    },
    {
      name: 'knowledge_search',
      description: '从知识库中检索与问题相关的文档片段。',
      schema: z.object({
        query: z.string().describe('检索查询文本')
      })
    }
  )
}
