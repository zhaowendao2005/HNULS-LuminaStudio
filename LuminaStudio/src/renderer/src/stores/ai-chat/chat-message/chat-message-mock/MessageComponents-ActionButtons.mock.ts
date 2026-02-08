import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const messages: ChatMessage[] = [
  {
    id: 'mock-action-buttons-1',
    role: 'assistant',
    status: 'final',
    blocks: [{ type: 'text', content: '这是 ActionButtons 组件示例，下面会显示交互按钮。' }]
  }
]

export const mockCase: MessageComponentMockCase = {
  id: 'action-buttons',
  label: 'ActionButtons',
  description: '助手消息渲染完成后显示操作按钮组件。',
  order: 90,
  buildMessages: () => messages
}
