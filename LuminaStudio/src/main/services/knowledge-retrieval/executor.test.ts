import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KnowledgeRetrievalResolvedScopeDto } from './types'
import {
  executeKnowledgeRetrievalSearch,
  limitKnowledgeRetrievalHits,
  normalizeRetrievalExecutionParams,
  sortKnowledgeRetrievalHits
} from './executor'

const originalFetch = globalThis.fetch

function createScope(
  overrides: Partial<KnowledgeRetrievalResolvedScopeDto> = {}
): KnowledgeRetrievalResolvedScopeDto {
  return {
    knowledgeBaseId: 1,
    fileKey: 'file-a.md',
    fileName: 'A.md',
    embeddingConfigId: 'cfg-a',
    dimensions: 1024,
    tableName: 'emb_cfg_cfg-a_1024_chunks',
    chunkCount: 2,
    ...overrides
  }
}

function createSuccessResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      data
    })
  } as Response
}

afterEach(() => {
  vi.restoreAllMocks()

  if (originalFetch) {
    globalThis.fetch = originalFetch
    return
  }

  Reflect.deleteProperty(globalThis, 'fetch')
})

describe('knowledge-retrieval executor', () => {
  it('允许 rerankTopN 小于 k', () => {
    expect(
      normalizeRetrievalExecutionParams({
        k: 5,
        rerank: {
          modelId: 'rerank-model-1',
          topN: 3
        }
      })
    ).toEqual({
      k: 5,
      ef: undefined,
      rerankModelId: 'rerank-model-1',
      rerankTopN: 3
    })
  })

  it('会按 knowledgeBaseId + tableName 分组请求，并把结果回填到各自 scope', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createSuccessResponse([
          {
            id: 'hit-b-1',
            content: 'B',
            file_key: 'file-b.md',
            file_name: 'B.md',
            rerank_score: 0.91,
            distance: 0.22
          },
          {
            id: 'hit-a-1',
            content: 'A',
            file_key: 'file-a.md',
            file_name: 'A.md',
            rerank_score: 0.83,
            distance: 0.31
          }
        ])
      )
      .mockResolvedValueOnce(
        createSuccessResponse([
          {
            id: 'hit-c-1',
            content: 'C',
            file_key: 'file-c.md',
            file_name: 'C.md',
            rerank_score: 0.97,
            distance: 0.11
          }
        ])
      )

    globalThis.fetch = fetchMock as unknown as typeof fetch

    const scopeA = createScope()
    const scopeB = createScope({
      fileKey: 'file-b.md',
      fileName: 'B.md'
    })
    const scopeC = createScope({
      fileKey: 'file-c.md',
      fileName: 'C.md',
      tableName: 'emb_cfg_cfg-b_1024_chunks'
    })

    const results = await executeKnowledgeRetrievalSearch({
      apiBaseUrl: 'http://127.0.0.1:3721',
      query: 'lumina studio',
      scopes: [scopeA, scopeB, scopeC],
      k: 5,
      rerankModelId: 'rerank-model-1',
      rerankTopN: 5
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)

    const firstRequestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body || '{}')) as {
      fileKeys?: string[]
      tableName?: string
    }
    const secondRequestBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body || '{}')) as {
      fileKeys?: string[]
      tableName?: string
    }

    expect(firstRequestBody).toMatchObject({
      tableName: 'emb_cfg_cfg-a_1024_chunks',
      fileKeys: ['file-a.md', 'file-b.md']
    })
    expect(secondRequestBody).toMatchObject({
      tableName: 'emb_cfg_cfg-b_1024_chunks',
      fileKeys: ['file-c.md']
    })

    expect(results).toHaveLength(3)
    expect(results[0].scope.fileKey).toBe('file-a.md')
    expect(results[0].hits.map((hit) => hit.id)).toEqual(['hit-a-1'])
    expect(results[1].scope.fileKey).toBe('file-b.md')
    expect(results[1].hits.map((hit) => hit.id)).toEqual(['hit-b-1'])
    expect(results[2].scope.fileKey).toBe('file-c.md')
    expect(results[2].hits.map((hit) => hit.id)).toEqual(['hit-c-1'])
  })

  it('会在合并后按 rerankScore 做全局排序', () => {
    const scopeA = createScope()
    const scopeB = createScope({
      fileKey: 'file-b.md',
      fileName: 'B.md'
    })

    const sortedHits = sortKnowledgeRetrievalHits(
      [
        {
          id: 'hit-a-1',
          content: 'A',
          fileKey: 'file-a.md',
          fileName: 'A.md',
          distance: 0.32,
          rerankScore: 0.71,
          scope: scopeA
        },
        {
          id: 'hit-b-1',
          content: 'B',
          fileKey: 'file-b.md',
          fileName: 'B.md',
          distance: 0.28,
          rerankScore: 0.94,
          scope: scopeB
        },
        {
          id: 'hit-a-2',
          content: 'A2',
          fileKey: 'file-a.md',
          fileName: 'A.md',
          distance: 0.21,
          rerankScore: 0.71,
          chunkIndex: 2,
          scope: scopeA
        }
      ],
      {
        useRerank: true
      }
    )

    expect(sortedHits.map((hit) => hit.id)).toEqual(['hit-b-1', 'hit-a-2', 'hit-a-1'])
  })

  it('会在全局排序后再按 rerankTopN 截断最终结果', () => {
    const scopeA = createScope()
    const scopeB = createScope({
      fileKey: 'file-b.md',
      fileName: 'B.md'
    })

    const hitA = {
      id: 'hit-a-1',
      content: 'A',
      fileKey: 'file-a.md',
      fileName: 'A.md',
      distance: 0.32,
      rerankScore: 0.71,
      scope: scopeA
    }
    const hitB = {
      id: 'hit-b-1',
      content: 'B',
      fileKey: 'file-b.md',
      fileName: 'B.md',
      distance: 0.28,
      rerankScore: 0.94,
      scope: scopeB
    }

    const limited = limitKnowledgeRetrievalHits({
      hits: [hitB, hitA],
      scopeResults: [
        {
          scope: scopeA,
          hits: [hitA]
        },
        {
          scope: scopeB,
          hits: [hitB]
        }
      ],
      useRerank: true,
      rerankTopN: 1
    })

    expect(limited.hits.map((hit) => hit.id)).toEqual(['hit-b-1'])
    expect(limited.scopeResults[0].hits).toEqual([])
    expect(limited.scopeResults[1].hits.map((hit) => hit.id)).toEqual(['hit-b-1'])
  })
})
