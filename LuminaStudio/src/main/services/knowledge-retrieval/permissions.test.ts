import { describe, expect, it } from 'vitest'
import { resolveKnowledgeRetrievalScopes } from './permissions'
import type { DocumentInfo } from '@shared/knowledge-database-api.types'

const documents: DocumentInfo[] = [
  {
    id: 'doc-1',
    fileKey: 'docs/a.md',
    fileName: 'a.md',
    fileType: 'md',
    updatedAt: '2026-03-19T00:00:00.000Z',
    embeddings: [
      {
        embeddingConfigId: '1',
        dimensions: 1536,
        status: 'completed',
        chunkCount: 10,
        updatedAt: '2026-03-19T00:00:00.000Z'
      },
      {
        embeddingConfigId: '2',
        dimensions: 3072,
        status: 'completed',
        chunkCount: 8,
        updatedAt: '2026-03-19T00:00:00.000Z'
      }
    ]
  },
  {
    id: 'doc-2',
    fileKey: 'docs/b.md',
    fileName: 'b.md',
    fileType: 'md',
    updatedAt: '2026-03-19T00:00:00.000Z',
    embeddings: [
      {
        embeddingConfigId: '1',
        dimensions: 1536,
        status: 'completed',
        chunkCount: 6,
        updatedAt: '2026-03-19T00:00:00.000Z'
      }
    ]
  }
]

describe('resolveKnowledgeRetrievalScopes', () => {
  it('在 KB allow 且没有文档子规则时展开全部文档与 embeddings', () => {
    const result = resolveKnowledgeRetrievalScopes({
      knowledgeBaseId: 1,
      documents,
      permissionTree: {
        effect: 'allow'
      }
    })

    expect(result.resolvedScopes).toHaveLength(3)
    expect(result.resolvedScopes.map((item) => item.tableName)).toEqual([
      'emb_cfg_1_1536_chunks',
      'emb_cfg_2_3072_chunks',
      'emb_cfg_1_1536_chunks'
    ])
  })

  it('支持文档 deny 下的 embedding allow 覆盖父级结果', () => {
    const result = resolveKnowledgeRetrievalScopes({
      knowledgeBaseId: 1,
      documents,
      permissionTree: {
        effect: 'allow',
        documents: [
          {
            fileKey: 'docs/a.md',
            effect: 'deny',
            embeddings: [
              {
                embeddingConfigId: '2',
                dimensions: 3072,
                effect: 'allow'
              }
            ]
          }
        ]
      }
    })

    expect(result.resolvedScopes).toHaveLength(2)
    expect(result.resolvedScopes).toEqual([
      expect.objectContaining({
        fileKey: 'docs/a.md',
        embeddingConfigId: '2',
        dimensions: 3072
      }),
      expect.objectContaining({
        fileKey: 'docs/b.md',
        embeddingConfigId: '1',
        dimensions: 1536
      })
    ])
  })

  it('对不存在的文档/embedding 规则给出 warning', () => {
    const result = resolveKnowledgeRetrievalScopes({
      knowledgeBaseId: 1,
      documents,
      permissionTree: {
        effect: 'deny',
        documents: [
          {
            fileKey: 'docs/missing.md',
            effect: 'allow',
            embeddings: [
              {
                embeddingConfigId: '404',
                dimensions: 1024,
                effect: 'allow'
              }
            ]
          }
        ]
      }
    })

    expect(result.resolvedScopes).toHaveLength(0)
    expect(result.warnings.map((item) => item.code)).toEqual([
      'DOCUMENT_RULE_TARGET_NOT_FOUND',
      'EMBEDDING_RULE_TARGET_NOT_FOUND'
    ])
  })
})
