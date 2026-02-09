import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const messages: ChatMessage[] = [
  {
    id: 'mock-usage-1',
    role: 'assistant',
    status: 'final',
    blocks: [
      {
        type: 'text',
        content: '这是 Usage 组件示例。'
      },
      {
        type: 'meta',
        usage: {
          inputTokens: 128,
          outputTokens: 256,
          reasoningTokens: 64,
          totalTokens: 448
        }
      }
    ]
  }
]

export const mockCase: MessageComponentMockCase = {
  id: 'usage',
  label: 'Usage',
  description: 'Token 使用信息组件。',
  order: 80,
  buildMessages: () => messages
}
