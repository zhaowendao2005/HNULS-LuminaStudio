import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { NormalChatConversationTurnDetail } from '@preload/types'
import { useNormalChatAgentDetailShellStore } from './agent-detail-shell.store'

function createTurnDetail(): NormalChatConversationTurnDetail {
  return {
    requestId: 'request-agent-1',
    topicId: 'topic-1',
    assistantId: 'assistant-1',
    assistantName: 'Mock Assistant',
    assistantEmoji: 'AI',
    topicTitle: 'Agent Topic',
    hasTrace: true,
    requestRecord: null,
    responseRecord: null,
    runtimeTrace: {
      traceVersion: 1,
      agentTree: {
        requestId: 'request-agent-1',
        rootAgentId: 'root-agent',
        fallbackTriggered: false,
        agents: {
          'root-agent': {
            agentId: 'root-agent',
            depth: 0,
            roleKind: 'director',
            taskKind: 'planning',
            goal: 'Coordinate branches.',
            summary: 'Created the execution plan.',
            finalResult: 'Execution complete.',
            status: 'completed',
            retryCount: 0,
            errorMessage: null,
            childAgentIds: ['worker-1'],
            planHistory: [
              {
                stepIndex: 1,
                phase: 'plan',
                action: 'dispatch',
                reasoning: 'Start one worker branch.',
                statusText: 'dispatching',
                budgetSummary: null,
                stopReason: null,
                actionsJson: null,
                parsedJson: '{"workerCount":1}'
              }
            ],
            helperInvocations: []
          },
          'worker-1': {
            agentId: 'worker-1',
            depth: 1,
            roleKind: 'worker',
            taskKind: 'search',
            goal: 'Collect references.',
            summary: 'Collected evidence.',
            finalResult: 'Returned evidence.',
            status: 'completed',
            retryCount: 0,
            errorMessage: null,
            childAgentIds: [],
            planHistory: [],
            helperInvocations: []
          }
        }
      },
      metrics: null,
      execution: null
    },
    messages: [
      {
        id: 'message-assistant-1',
        topicId: 'topic-1',
        requestId: 'request-agent-1',
        role: 'assistant',
        parts: [{ kind: 'text', text: 'Agent run complete.' }],
        createdAt: '2026-03-28T00:00:01.000Z',
        updatedAt: '2026-03-28T00:00:01.000Z'
      }
    ]
  }
}

describe('agent detail shell store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('window', {
      api: {
        normalChat: {
          getConversationTurnDetail: vi.fn().mockResolvedValue({
            success: true,
            data: createTurnDetail()
          })
        }
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('loads an agent runtime tree from the dedicated agent detail shell', async () => {
    const store = useNormalChatAgentDetailShellStore()
    await store.initialize()
    await store.openDialog({
      requestId: 'request-agent-1',
      messageId: 'message-assistant-1'
    })

    expect(store.snapshot.visible).toBe(true)
    expect(store.tree?.rootAgentId).toBe('root-agent')
    expect(store.summary?.totalAgents).toBe(2)
    expect(store.rootNode?.agentId).toBe('root-agent')
  })
})
