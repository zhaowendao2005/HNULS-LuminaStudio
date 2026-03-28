import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { NormalChatConversationTurnDetail } from '@preload/types'
import { useNormalChatFunctioncallDetailShellStore } from './functioncall-detail-shell.store'

function createTurnDetail(): NormalChatConversationTurnDetail {
  return {
    requestId: 'request-call-1',
    topicId: 'topic-1',
    assistantId: 'assistant-1',
    assistantName: 'Mock Assistant',
    assistantEmoji: 'AI',
    topicTitle: 'Functioncall Topic',
    hasTrace: false,
    requestRecord: null,
    responseRecord: null,
    runtimeTrace: null,
    messages: [
      {
        id: 'message-user-1',
        topicId: 'topic-1',
        requestId: 'request-call-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Search the literature.' }],
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'message-assistant-1',
        topicId: 'topic-1',
        requestId: 'request-call-1',
        role: 'assistant',
        parts: [
          {
            kind: 'functioncall',
            callId: 'call-1',
            functionCallName: 'pubmedSearch',
            title: 'PubMed Search',
            status: 'success',
            input: '{"query":"MAPK signaling"}',
            output: '{"hits":2}',
            errorMessage: null,
            isStreaming: false,
            roundIndex: 1,
            batchIndex: 0,
            parallelIndex: 0,
            depth: 0,
            decisionReason: 'Collect citations first.'
          },
          {
            kind: 'functioncall',
            callId: 'call-2',
            functionCallName: 'knowledgeSearch',
            title: 'Knowledge Search',
            status: 'error',
            input: '{"query":"ERK biomarkers"}',
            output: '',
            errorMessage: 'timeout',
            isStreaming: false,
            roundIndex: 1,
            batchIndex: 0,
            parallelIndex: 1,
            depth: 0,
            decisionReason: 'Try a second source.'
          }
        ],
        createdAt: '2026-03-28T00:00:01.000Z',
        updatedAt: '2026-03-28T00:00:01.000Z'
      }
    ]
  }
}

describe('functioncall detail shell store', () => {
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

  it('opens the selected functioncall directly without depending on chat detail state', async () => {
    const store = useNormalChatFunctioncallDetailShellStore()
    await store.initialize()
    await store.openDialog({
      requestId: 'request-call-1',
      messageId: 'message-assistant-1',
      callId: 'call-2'
    })

    expect(store.snapshot.visible).toBe(true)
    expect(store.functionCallItems).toHaveLength(2)
    expect(store.selectedCallItem?.id).toBe('call-2')
    expect(store.formattedSelectedCallResponse).toContain('timeout')
  })
})
