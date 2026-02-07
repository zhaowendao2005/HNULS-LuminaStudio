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

export function createKnowledgeSearchTool(params: {
  apiBaseUrl: string
  retrieval: LangchainClientRetrievalConfig
}) {
  const apiBaseUrl = params.apiBaseUrl.trim().replace(/\/$/, '')
  const retrieval = params.retrieval

  return tool(
    async ({ query }: { query: string }) => {
      const url = `${apiBaseUrl}/api/v1/retrieval/search`

      const body = {
        knowledgeBaseId: retrieval.knowledgeBaseId,
        tableName: retrieval.tableName,
        queryText: query,
        k: retrieval.k,
        ef: retrieval.ef,
        rerankModelId: retrieval.rerankModelId,
        rerankTopN: retrieval.rerankTopN
      }

      log.info('Retrieval search request', {
        knowledgeBaseId: retrieval.knowledgeBaseId,
        tableName: retrieval.tableName,
        k: retrieval.k ?? null,
        ef: retrieval.ef ?? null,
        rerankModelId: retrieval.rerankModelId ?? null,
        rerankTopN: retrieval.rerankTopN ?? null
      })

      const resp = await globalThis.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      let json: ApiResponse<RetrievalHit[]> | null = null
      try {
        json = (await resp.json()) as ApiResponse<RetrievalHit[]>
      } catch {
        // ignore parse error, handle below
      }

      if (!resp.ok) {
        const msg =
          (json && typeof json.error === 'object' && json.error?.message) ||
          (json && typeof json.error === 'string' && json.error) ||
          `HTTP_${resp.status}`
        throw new Error(`Knowledge retrieval failed: ${msg}`)
      }

      if (!json?.success) {
        const msg =
          (json && typeof json.error === 'object' && json.error?.message) ||
          (json && typeof json.error === 'string' && json.error) ||
          'Unknown retrieval error'
        throw new Error(`Knowledge retrieval failed: ${msg}`)
      }

      const hits = (json.data ?? []) as RetrievalHit[]
      log.info('Retrieval search response', { count: hits.length })

      return formatHits(hits)
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
