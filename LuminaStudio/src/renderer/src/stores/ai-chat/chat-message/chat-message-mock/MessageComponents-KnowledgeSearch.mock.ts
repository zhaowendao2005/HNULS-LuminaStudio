import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const messages: ChatMessage[] = [
  {
    id: 'mock-knowledge-search-1',
    role: 'assistant',
    status: 'final',
    blocks: [
      {
        type: 'node',
        start: {
          nodeId: 'node-knowledge-search-1',
          nodeKind: 'knowledge_retrieval',
          inputs: {}
        },
        result: {
          nodeId: 'node-knowledge-search-1',
          nodeKind: 'knowledge_retrieval',
          outputs: {
            result: {
              query: '什么是 RAG',
              totalScopes: 1,
              scopes: [
                {
                  knowledgeBaseId: 1,
                  tableName: 'emb_cfg_1_1536_chunks',
                  fileKeysCount: 1,
                  hits: [
                    {
                      id: 'hit-1',
                      content: 'RAG 是检索增强生成流程，先检索，再融合上下文生成答案。',
                      file_name: 'rag-intro.md',
                      chunk_index: 12,
                      distance: 0.1242,
                      rerank_score: 0.918
                    }
                  ]
                }
              ]
            }
          }
        }
      } as any
    ]
  } as ChatMessage
]

export const mockCase: MessageComponentMockCase = {
  id: 'knowledge-search',
  label: 'KnowledgeSearch',
  description: '知识检索结果卡片，支持 scope/hit 展示。',
  order: 50,
  buildMessages: () => messages
}

