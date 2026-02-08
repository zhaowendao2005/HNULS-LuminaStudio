import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const detailPayload = {
  scope: {
    knowledgeBaseId: 1,
    tableName: 'emb_cfg_1_1536_chunks',
    fileKeysCount: 1
  },
  hit: {
    id: 'hit-1',
    content: 'DetailDialog 示例内容：展示完整命中段落与元信息。',
    file_name: 'rag-intro.md',
    chunk_index: 12,
    distance: 0.1242,
    rerank_score: 0.918
  },
  scopeIdx: 0,
  hitIdx: 0
}

const messages: ChatMessage[] = [
  {
    id: 'mock-knowledge-detail-1',
    role: 'assistant',
    status: 'final',
    blocks: [{ type: 'text', content: '该示例会自动弹出 KnowledgeSearch DetailDialog。' }]
  }
]

export const mockCase: MessageComponentMockCase = {
  id: 'knowledge-search-detail-dialog',
  label: 'KnowledgeSearch-DetailDialog',
  description: '知识检索详情弹窗组件。',
  order: 60,
  buildMessages: () => messages,
  onApply: ({ openKnowledgeSearchDetail }) => {
    openKnowledgeSearchDetail(detailPayload)
  }
}

