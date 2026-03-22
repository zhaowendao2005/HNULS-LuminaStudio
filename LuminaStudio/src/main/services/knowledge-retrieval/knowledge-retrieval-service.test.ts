import { describe, expect, it } from 'vitest'
import type { DocumentInfo } from '@shared/knowledge-database-api.types'
import type { KnowledgeDatabaseBridgeService } from '@main/services/knowledge-database-bridge'
import { KnowledgeRetrievalService } from './knowledge-retrieval-service'

function createDocument(fileKey: string, fileName: string): DocumentInfo {
  return {
    id: `${fileKey}-id`,
    fileKey,
    fileName,
    fileType: 'md',
    updatedAt: '2026-03-22T00:00:00.000Z',
    embeddings: [
      {
        embeddingConfigId: 'default-embedding',
        dimensions: 1536,
        status: 'completed',
        chunkCount: 2,
        updatedAt: '2026-03-22T00:00:00.000Z'
      }
    ]
  }
}

describe('KnowledgeRetrievalService', () => {
  it('会把显式选择的知识库和文档范围收敛成检索参数', async () => {
    const retrievalCalls: Array<{
      knowledgeBaseId: number
      tableName: string
      fileKeys?: string[]
      queryText: string
    }> = []

    const bridge = {
      async listAllDocuments({ knowledgeBaseId }: { knowledgeBaseId: number }) {
        if (knowledgeBaseId !== 1) {
          return []
        }
        return [createDocument('docs/a.md', 'A')]
      },
      async retrievalSearch(params: {
        knowledgeBaseId: number
        tableName: string
        queryText: string
        fileKeys?: string[]
      }) {
        retrievalCalls.push(params)
        return {
          success: true as const,
          data: [
            {
              id: 'hit-1',
              content: 'matched content',
              file_key: 'docs/a.md',
              file_name: 'A'
            }
          ]
        }
      }
    } as unknown as KnowledgeDatabaseBridgeService

    const service = new KnowledgeRetrievalService(bridge)
    const result = await service.search({
      knowledgeBaseId: 1,
      selectedKnowledgeBaseIds: [1],
      selectedDocumentFileKeysByKnowledgeBase: {
        1: ['docs/a.md']
      },
      query: 'lumina studio',
      permissionTree: {
        knowledgeBaseId: 1,
        knowledgeBaseIds: [1],
        effect: 'allow',
        documents: [
          {
            fileKey: 'docs/a.md',
            effect: 'allow'
          }
        ]
      },
      k: 5
    })

    expect(retrievalCalls).toHaveLength(1)
    expect(retrievalCalls[0]).toMatchObject({
      knowledgeBaseId: 1,
      queryText: 'lumina studio',
      fileKeys: ['docs/a.md']
    })
    expect(result.knowledgeBaseIds).toEqual([1])
    expect(result.resolvedScopes).toHaveLength(1)
    expect(result.hits).toHaveLength(1)
  })

  it('在没有命中内容时会直接报错', async () => {
    const bridge = {
      async listAllDocuments() {
        return [createDocument('docs/a.md', 'A')]
      },
      async retrievalSearch() {
        return {
          success: true as const,
          data: []
        }
      }
    } as unknown as KnowledgeDatabaseBridgeService

    const service = new KnowledgeRetrievalService(bridge)

    await expect(
      service.search({
        knowledgeBaseId: 1,
        selectedKnowledgeBaseIds: [1],
        selectedDocumentFileKeysByKnowledgeBase: {
          1: ['docs/a.md']
        },
        query: 'lumina studio',
        permissionTree: {
          knowledgeBaseId: 1,
          knowledgeBaseIds: [1],
          effect: 'allow',
          documents: [
            {
              fileKey: 'docs/a.md',
              effect: 'allow'
            }
          ]
        },
        k: 5
      })
    ).rejects.toThrow('知识检索未召回任何内容')
  })
})
