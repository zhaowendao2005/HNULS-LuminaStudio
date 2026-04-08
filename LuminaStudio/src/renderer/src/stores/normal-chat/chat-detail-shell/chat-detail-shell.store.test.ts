import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type {
  NormalChatRequestDebugSnapshot,
  NormalChatRequestDetailSnapshot
} from '@preload/types'
import { useNormalChatChatDetailShellStore } from './chat-detail-shell.store'

function createRequestDetail(): NormalChatRequestDetailSnapshot {
  return {
    head: {
      requestId: 'request-chat-1',
      assistantId: 'assistant-1',
      topicId: 'topic-1',
      conversationId: 'conversation-1',
      rootAgentRunId: null,
      userMessageId: 'message-user-1',
      assistantMessageId: 'message-assistant-1',
      status: 'succeeded',
      phase: 'finished',
      errorMessage: null,
      createdAt: '2026-03-28T00:00:00.000Z',
      startedAt: '2026-03-28T00:00:00.100Z',
      finishedAt: '2026-03-28T00:00:01.000Z',
      updatedAt: '2026-03-28T00:00:01.000Z',
      lastEntrySeq: 0
    },
    requestId: 'request-chat-1',
    topicId: 'topic-1',
    assistantId: 'assistant-1',
    assistantName: 'Mock Assistant',
    assistantEmoji: 'AI',
    topicTitle: 'Chat Topic',
    modelProviderId: 'openai',
    modelId: 'gpt-4.1',
    executionSnapshot: {
      assistant: {
        id: 'assistant-1',
        name: 'Mock Assistant',
        emoji: 'AI'
      },
      topic: {
        id: 'topic-1',
        title: 'Chat Topic'
      },
      conversation: {
        id: 'conversation-1',
        title: 'Chat Topic',
        agentTemplateId: 'agent-template-1'
      },
      request: {
        input: 'Summarize this turn.',
        providerId: 'openai',
        modelId: 'gpt-4.1'
      },
      runtime: {
        systemPrompt: 'You are helpful.',
        streamingEnabled: true,
        contextMemoryRounds: 8,
        maxRecursionDepth: 2,
        maxReasoningSteps: 4,
        persistencePreset: 'full',
        promptBudgetChars: 4000,
        roundMemoryWindow: 4,
        maxRepairAttempts: 2,
        maxProviderRetries: 2
      },
      historyMessages: [],
      promptInjections: [],
      actions: [],
      createdAt: '2026-03-28T00:00:00.000Z'
    },
    finalResponse: {
      chunks: ['Final answer'],
      finalText: 'Final answer',
      aborted: false,
      errorMessage: null,
      completedAt: '2026-03-28T00:00:01.000Z',
      assistantMessageId: 'message-assistant-1'
    },
    messages: [
      {
        id: 'message-user-1',
        topicId: 'topic-1',
        requestId: 'request-chat-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Summarize this turn.' }],
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:00.000Z'
      },
      {
        id: 'message-assistant-1',
        topicId: 'topic-1',
        requestId: 'request-chat-1',
        role: 'assistant',
        parts: [
          {
            kind: 'functioncall',
            callId: 'action-run-1',
            functionCallName: 'functioncall.pubmed_search',
            title: 'functioncall.pubmed_search',
            status: 'success',
            input: JSON.stringify(
              {
                query: 'BRCA1 breast cancer',
                top_k: 5,
                sort: 'relevance',
                date_from: null,
                date_to: null,
                api_key_ref_id: null
              },
              null,
              2
            ),
            output: '{"result":{"total_found":3}}',
            errorMessage: null,
            isStreaming: false,
            roundIndex: 0,
            batchIndex: 0,
            parallelIndex: 0,
            depth: 0,
            decisionReason: 'PubMed search'
          },
          { kind: 'text', text: 'Final answer' }
        ],
        createdAt: '2026-03-28T00:00:01.000Z',
        updatedAt: '2026-03-28T00:00:01.000Z'
      }
    ],
    agentRuns: [],
    modelCalls: [
      {
        id: 'model-call-1',
        seq: 1,
        taskId: 'task-1',
        requestId: 'request-chat-1',
        conversationId: 'conversation-1',
        agentRunId: 'agent-run-1',
        parentActionRunId: null,
        depth: 0,
        roundIndex: 0,
        callIndexInAgent: 0,
        status: 'succeeded',
        requestPayloadJson: JSON.stringify({
          providerId: 'openai',
          modelId: 'gpt-4.1',
          streamingEnabled: true,
          input: 'Summarize this turn.'
        }),
        compiledPromptJson: {
          systemSections: {
            identity: 'You are helpful.',
            outputContract: 'Return markdown.',
            actionProtocol: 'No actions.',
            repairContract: ''
          },
          roundSections: {
            context: 'conversation context',
            priorRoundMemory: '',
            actionDescriptions: '',
            loadedActionSpecs: '',
            actionResults: '',
            actionFeedback: ''
          },
          compiledSystemPrompt: 'You are helpful.',
          compiledRoundPrompt: 'Summarize this turn.',
          trimSnapshot: null
        },
        compiledPromptMarkdown: '# Prompt\n\nSummarize this turn.',
        historyMessagesJson: JSON.stringify([]),
        loadedActionsJson: JSON.stringify([]),
        actionResultsJson: JSON.stringify([]),
        responseStreamText: 'Final answer',
        responseEnvelopeJson: JSON.stringify({
          body_md: 'Final answer',
          action_calls: [],
          thinking_md: null
        }),
        finalReplyMd: 'Final answer',
        errorMessage: null,
        createdAt: '2026-03-28T00:00:00.000Z',
        startedAt: '2026-03-28T00:00:00.100Z',
        finishedAt: '2026-03-28T00:00:01.000Z',
        updatedAt: '2026-03-28T00:00:01.000Z'
      }
    ],
    actionRuns: [
      {
        id: 'action-run-1',
        taskId: 'task-1',
        agentRunId: 'agent-run-1',
        actionKey: 'functioncall.pubmed_search',
        actionKind: 'functioncall',
        mode: 'fast',
        status: 'succeeded',
        roundIndex: 0,
        batchIndex: 0,
        parallelIndex: 0,
        inputJson: JSON.stringify({ query: 'BRCA1 breast cancer' }),
        outputJson: '{"result":{"total_found":3}}',
        errorMessage: null,
        createdAt: '2026-03-28T00:00:00.300Z',
        startedAt: '2026-03-28T00:00:00.320Z',
        finishedAt: '2026-03-28T00:00:00.800Z',
        updatedAt: '2026-03-28T00:00:00.800Z'
      }
    ]
  }
}

function createRequestDebugSnapshot(
  detail: NormalChatRequestDetailSnapshot
): NormalChatRequestDebugSnapshot {
  return {
    detail,
    agentGraph: {
      tree: null,
      summary: null
    },
    highWatermark: 0
  }
}

describe('chat detail shell store', () => {
  let streamHandler: ((event: any) => void) | null = null

  function createLightRequestDetail(): NormalChatRequestDetailSnapshot {
    const detail = createRequestDetail()
    return {
      ...detail,
      executionSnapshot: {
        ...detail.executionSnapshot,
        runtime: {
          ...detail.executionSnapshot.runtime,
          persistencePreset: 'light'
        }
      },
      modelCalls: []
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('window', {
      api: {
        normalChat: {
          getRequestDebugSnapshot: vi.fn().mockResolvedValue({
            success: true,
            data: createRequestDebugSnapshot(createRequestDetail())
          }),
          onStream: vi.fn().mockImplementation((handler) => {
            streamHandler = handler
            return () => {
              streamHandler = null
            }
          }),
          onRequestTraceEntry: vi.fn().mockImplementation(() => () => undefined)
        }
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens a chat detail dialog with grouped model call documents', async () => {
    const store = useNormalChatChatDetailShellStore()
    await store.initialize()
    await store.openDialog({
      requestId: 'request-chat-1',
      messageId: 'message-assistant-1'
    })

    expect(store.snapshot.visible).toBe(true)
    expect(store.llmCallItems).toHaveLength(1)
    expect(store.llmCallItems[0]?.id).toBe('model-call-1')
    expect(store.llmCallItems[0]?.title).toBe('Model Call #1')
    expect(store.selectedGroups).toHaveLength(2)
    expect(store.selectedGroups[0]?.id).toBe('request')
    expect(store.snapshot.selectedGroupId).toBe('request')
    expect(store.snapshot.selectedDocId).toBe('request.request_meta')
    expect(store.functioncallItems).toHaveLength(1)
    expect(store.functioncallItems[0]?.autofilledKeys).toEqual([
      'top_k',
      'sort',
      'date_from',
      'date_to',
      'api_key_ref_id'
    ])
    expect(store.functioncallItems[0]?.requestPayload).toEqual({
      query: 'BRCA1 breast cancer',
      top_k: 5,
      sort: 'relevance',
      date_from: null,
      date_to: null,
      api_key_ref_id: null
    })
  })

  it('patches response stream text when runtime text deltas arrive', async () => {
    const store = useNormalChatChatDetailShellStore()
    await store.initialize()
    await store.openDialog({
      requestId: 'request-chat-1',
      messageId: 'message-assistant-1'
    })

    streamHandler?.({
      type: 'assistant-text-delta',
      requestId: 'request-chat-1',
      topicId: 'topic-1',
      modelCallId: 'model-call-1',
      delta: ' + streamed tail',
      roundIndex: 0,
      depth: 0
    })

    const responseGroup = store.selectedCallItem?.groups.find((group) => group.id === 'response')
    const streamTextItem = responseGroup?.items.find((item) => item.id === 'response.stream_text')
    expect(streamTextItem?.payload).toBe('Final answer + streamed tail')
  })

  it('keeps overview state and blocks llm detail when light persistence removed model calls', async () => {
    const getRequestDebugSnapshot = vi.fn().mockResolvedValue({
      success: true,
      data: createRequestDebugSnapshot(createLightRequestDetail())
    })
    vi.stubGlobal('window', {
      api: {
        normalChat: {
          getRequestDebugSnapshot,
          onStream: vi.fn().mockImplementation((handler) => {
            streamHandler = handler
            return () => {
              streamHandler = null
            }
          }),
          onRequestTraceEntry: vi.fn().mockImplementation(() => () => undefined)
        }
      }
    })

    const store = useNormalChatChatDetailShellStore()
    await store.initialize()
    await store.openDialog({
      requestId: 'request-chat-1',
      messageId: 'message-assistant-1',
      page: 'llm-call'
    })

    expect(store.detail?.hasLlmCallDetails).toBe(false)
    expect(store.snapshot.currentPage).toBe('overview')
    expect(store.snapshot.selectedCallId).toBe('')
    expect(store.breadcrumbText).toBe('Overview / LLM Call Unavailable')

    store.openCallDetail('missing-call')
    expect(store.snapshot.currentPage).toBe('overview')
    expect(store.snapshot.selectedCallId).toBe('')
  })
})
