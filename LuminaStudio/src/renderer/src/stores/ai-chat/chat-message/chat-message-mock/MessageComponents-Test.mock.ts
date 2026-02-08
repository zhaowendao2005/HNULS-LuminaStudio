import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const messages: ChatMessage[] = [
  {
    id: 'mock-test-message-1',
    role: 'test',
    status: 'final',
    blocks: [],
    rawData: {
      source: 'mock-case',
      message: '这是用于 DevPage 的测试数据块。',
      ts: '2026-02-08T00:00:00.000Z'
    }
  } as ChatMessage
]

export const mockCase: MessageComponentMockCase = {
  id: 'test',
  label: 'Test',
  description: '测试消息原始 JSON 展示组件。',
  order: 100,
  buildMessages: () => messages
}

