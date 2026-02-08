import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const messages: ChatMessage[] = [
  {
    id: 'mock-tool-call-1',
    role: 'assistant',
    status: 'final',
    blocks: [
      {
        type: 'tool',
        call: {
          toolCallId: 'tool-call-1',
          toolName: 'web_search',
          toolArgs: {
            query: 'RAG architecture trends'
          }
        },
        result: {
          results: [
            {
              title: 'RAG Overview',
              snippet: 'A practical retrieval-augmented generation architecture guide.'
            }
          ]
        }
      } as any
    ]
  } as ChatMessage
]

export const mockCase: MessageComponentMockCase = {
  id: 'tool-call',
  label: 'ToolCall',
  description: '工具调用组件（输入参数 + 结果）。',
  order: 25,
  buildMessages: () => messages
}

