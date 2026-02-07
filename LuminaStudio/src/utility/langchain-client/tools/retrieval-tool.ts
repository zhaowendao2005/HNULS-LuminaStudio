import { tool } from 'langchain'
import { z } from 'zod'
import { logger } from '@main/services/logger'
import type { LangchainClientRetrievalConfig, LangchainClientRetrievalScope } from '@shared/langchain-client.types'

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

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}

function formatHits(hits: RetrievalHit[]): string {
  if (!hits || hits.length === 0) {
    return '【知识库检索结果】\n(无召回结果)'
  }

  const lines: string[] = []
  lines.push(`【知识库检索结果】共 ${hits.length} 条`)

  hits.forEach((hit, idx) => {
    const header = [
      `#${idx + 1}`,
      hit.file_name ? `file=${hit.file_name}` : null,
      hit.chunk_index !== undefined ? `chunk=${hit.chunk_index}` : null,
      hit.distance !== undefined ? `distance=${hit.distance}` : null,
      hit.rerank_score !== undefined ? `rerank=${hit.rerank_score}` : null
    ]
      .filter(Boolean)
      .join(' | ')

    lines.push(header)
    lines.push(truncate(hit.content ?? '', 1200))
  })

  return lines.join('\n')
}

function formatScopeHeader(scope: LangchainClientRetrievalScope): string {
  const fileKeysCount = scope.fileKeys?.length ?? 0
  return `scope(kb=${scope.knowledgeBaseId} | table=${scope.tableName} | fileKeys=${fileKeysCount})`
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
        return '【知识库检索结果】\n(未选择检索范围：请在左侧 SourcesTab 选择文档/嵌入版本后再试)'
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

      const blocks: string[] = []

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
          blocks.push(`【${formatScopeHeader(scope)}】\n(请求失败: ${msg})`)
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
          blocks.push(`【${formatScopeHeader(scope)}】\n(检索失败: ${msg})`)
          continue
        }

        const hits = (json.data ?? []) as RetrievalHit[]
        blocks.push(`【${formatScopeHeader(scope)}】\n${formatHits(hits)}`)
      }

      return blocks.join('\n\n')
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
