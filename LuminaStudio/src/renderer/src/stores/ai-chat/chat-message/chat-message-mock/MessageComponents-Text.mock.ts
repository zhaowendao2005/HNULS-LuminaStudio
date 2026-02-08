import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const messages: ChatMessage[] = [
  {
    id: 'mock-text-1',
    role: 'user',
    status: 'final',
    blocks: [{ type: 'text', content: '请给一个 RAG 的简短定义。' }]
  },
  {
    id: 'mock-text-2',
    role: 'assistant',
    status: 'final',
    blocks: [
      {
        type: 'text',
        content:
          'RAG（Retrieval-Augmented Generation）是将检索到的外部知识注入生成模型上下文，再生成回答的流程。'
      }
    ]
  }
]

export const mockCase: MessageComponentMockCase = {
  id: 'text',
  label: 'Text',
  description: '文本消息组件（用户+助手）。',
  order: 10,
  buildMessages: () => messages
}

