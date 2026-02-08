import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const messages: ChatMessage[] = [
  {
    id: 'mock-retrieval-summary-1',
    role: 'assistant',
    status: 'final',
    blocks: [
      {
        type: 'node',
        start: {
          nodeId: 'node-retrieval-summary-1',
          nodeKind: 'retrieval_summary',
          modelId: 'gpt-4o-mini',
          inputs: {
            iteration: 1,
            maxIterations: 3
          }
        },
        result: {
          nodeId: 'node-retrieval-summary-1',
          nodeKind: 'retrieval_summary',
          modelId: 'gpt-4o-mini',
          outputs: {
            shouldLoop: false,
            message: '证据充分，可以直接返回答案。'
          }
        }
      } as any
    ]
  } as ChatMessage
]

export const mockCase: MessageComponentMockCase = {
  id: 'retrieval-summary',
  label: 'RetrievalSummary',
  description: '检索总结节点组件。',
  order: 40,
  buildMessages: () => messages
}

