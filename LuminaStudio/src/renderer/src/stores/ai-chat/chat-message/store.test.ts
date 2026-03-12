import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AiChatStreamEvent } from '@preload/types'
import type { NodeBlock } from './types'

const { subscribeStreamMock } = vi.hoisted(() => ({
  subscribeStreamMock: vi.fn(() => () => {})
}))

vi.mock('./datasource', () => ({
  ChatMessageDataSource: {
    subscribeStream: subscribeStreamMock
  }
}))

import { useChatMessageStore } from './store'

function emitStreamStart(store: ReturnType<typeof useChatMessageStore>): void {
  store.handleStreamEvent({
    type: 'stream-start',
    requestId: 'req-1',
    conversationId: 'conv-1',
    providerId: 'provider-1',
    modelId: 'model-1',
    startedAt: '2026-03-12T00:00:00.000Z'
  } satisfies AiChatStreamEvent)
}

describe('chat-message.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    subscribeStreamMock.mockReturnValue(() => {})
  })

  it('ignores internal continue-planning node blocks in normal chat', () => {
    const store = useChatMessageStore()
    emitStreamStart(store)

    store.handleStreamEvent({
      type: 'node-start',
      requestId: 'req-1',
      payload: {
        nodeId: 'planning-node-1',
        nodeKind: 'planning',
        label: '回环规划',
        inputs: {
          iteration: 1,
          planningInput: '继续补充检索方向'
        }
      }
    } satisfies AiChatStreamEvent)

    store.handleStreamEvent({
      type: 'node-result',
      requestId: 'req-1',
      payload: {
        nodeId: 'planning-node-1',
        nodeKind: 'planning',
        label: '回环规划',
        outputs: {
          rationale: '继续规划',
          toolCalls: [{ toolId: 'knowledge_retrieval', params: { query: '继续检索' } }]
        }
      }
    } satisfies AiChatStreamEvent)

    const [message] = store.getMessages('conv-1')

    expect(message.blocks).toEqual([])
  })

  it('keeps initial planning node blocks for approval-facing planning steps', () => {
    const store = useChatMessageStore()
    emitStreamStart(store)

    store.handleStreamEvent({
      type: 'node-start',
      requestId: 'req-1',
      payload: {
        nodeId: 'planning-node-1',
        nodeKind: 'initial_planning',
        label: '首轮深度规划',
        inputs: {
          iteration: 0,
          planningInput: '给出第一轮检索方案'
        }
      }
    } satisfies AiChatStreamEvent)

    store.handleStreamEvent({
      type: 'node-result',
      requestId: 'req-1',
      payload: {
        nodeId: 'planning-node-1',
        nodeKind: 'initial_planning',
        label: '首轮深度规划',
        outputs: {
          rationale: '首轮规划完成',
          toolCalls: [{ toolId: 'knowledge_retrieval', params: { query: '首轮检索' } }]
        }
      }
    } satisfies AiChatStreamEvent)

    const [message] = store.getMessages('conv-1')
    const [block] = message.blocks as NodeBlock[]

    expect(message.blocks).toHaveLength(1)
    expect(block.type).toBe('node')
    expect(block.start.nodeKind).toBe('initial_planning')
    expect(block.result?.outputs).toMatchObject({
      rationale: '首轮规划完成'
    })
  })
})
