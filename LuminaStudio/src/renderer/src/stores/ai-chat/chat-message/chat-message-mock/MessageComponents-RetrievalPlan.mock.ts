import type { ChatMessage } from '../types'
import type { MessageComponentMockCase } from './types'

const messages: ChatMessage[] = [
  {
    id: 'mock-retrieval-plan-1',
    role: 'assistant',
    status: 'final',
    blocks: [
      {
        type: 'node',
        start: {
          nodeId: 'node-retrieval-plan-1',
          nodeKind: 'retrieval_plan',
          modelId: 'gpt-4o-mini',
          inputs: {
            planningInput: '请规划检索策略并生成 query 集合'
          }
        },
        result: {
          nodeId: 'node-retrieval-plan-1',
          nodeKind: 'retrieval_plan',
          modelId: 'gpt-4o-mini',
          outputs: {
            maxK: 5,
            rationale: '先宽检索，再聚焦高相关实体',
            queries: [
              { query: 'RAG architecture', k: 5 },
              { query: 'retrieval augmentation examples', k: 3 }
            ]
          }
        }
      } as any
    ]
  } as ChatMessage
]

export const mockCase: MessageComponentMockCase = {
  id: 'retrieval-plan',
  label: 'RetrievalPlan',
  description: '检索规划节点组件。',
  order: 30,
  buildMessages: () => messages
}
