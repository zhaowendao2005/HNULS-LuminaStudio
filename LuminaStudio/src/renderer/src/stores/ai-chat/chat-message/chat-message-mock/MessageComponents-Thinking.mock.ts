import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const messages: ChatMessage[] = [
  {
    id: 'mock-thinking-1',
    role: 'assistant',
    status: 'final',
    blocks: [
      {
        type: 'thinking',
        isThinking: false,
        steps: [
          { id: 'step-1', content: '识别用户问题中的核心实体。' },
          { id: 'step-2', content: '规划先检索后总结的执行路径。' },
          { id: 'step-3', content: '根据证据生成最终答案。' }
        ]
      }
    ]
  }
]

export const mockCase: MessageComponentMockCase = {
  id: 'thinking',
  label: 'Thinking',
  description: '思考过程组件（可展开/收起）。',
  order: 20,
  buildMessages: () => messages
}

