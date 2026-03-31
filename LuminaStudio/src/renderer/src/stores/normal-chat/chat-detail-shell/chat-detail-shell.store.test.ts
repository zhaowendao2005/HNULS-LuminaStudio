import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { NormalChatConversationTurnDetail } from '@preload/types'
import { useNormalChatChatDetailShellStore } from './chat-detail-shell.store'

function createTurnDetail(): NormalChatConversationTurnDetail {
  return {
    requestId: 'request-chat-1',
    topicId: 'topic-1',
    assistantId: 'assistant-1',
    assistantName: 'Mock Assistant',
    assistantEmoji: 'AI',
    topicTitle: 'Chat Topic',
    hasTrace: false,
    requestRecord: {
      assistant: {
        id: 'assistant-1',
        name: 'Mock Assistant',
        emoji: 'AI',
        defaultSystemPrompt: 'You are helpful.',
        streamingEnabled: true,
        callMode: 'auto',
        costMode: 'per_token',
        defaultModelProviderId: 'openai',
        defaultModelId: 'gpt-4.1',
        contextMemoryRounds: 8,
        maxRecursionDepth: 2,
        maxReasoningSteps: 4
      },
      topic: {
        id: 'topic-1',
        title: 'Chat Topic',
        systemPromptMode: 'inherit',
        systemPromptOverride: null
      },
      providerId: 'openai',
      modelId: 'gpt-4.1',
      streamingEnabled: true,
      input: 'Summarize this turn.',
      effectiveSystemPrompt: 'You are helpful.',
      promptMessages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Summarize this turn.' }
      ]
    },
    responseRecord: {
      chunks: ['Final answer'],
      finalText: 'Final answer',
      aborted: false,
      errorMessage: null,
      completedAt: '2026-03-28T00:00:00.000Z'
    },
    runtimeTrace: {
      traceVersion: 1,
      agentTree: null,
      metrics: {
        providerId: 'openai',
        providerName: 'OpenAI',
        modelId: 'gpt-4.1',
        modelName: 'GPT-4.1',
        firstTokenLatencyMs: 120,
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        modelCallCount: 1,
        streamingEnabled: true
      },
      execution: null
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
        parts: [{ kind: 'text', text: 'Final answer' }],
        createdAt: '2026-03-28T00:00:01.000Z',
        updatedAt: '2026-03-28T00:00:01.000Z'
      }
    ],
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
        status: 'completed',
        requestPayloadJson: JSON.stringify({
          providerId: 'openai',
          modelId: 'gpt-4.1',
          input: 'Summarize this turn.'
        }),
        compiledPromptJson: {
          context: 'context block',
          actionDescriptions: 'action descriptions',
          loadedActionSpecs: 'loaded action specs',
          actionResults: 'action results',
          outputContract: 'output contract'
        },
        compiledPromptMarkdown: '# Prompt\n\nSummarize this turn.',
        historyMessagesJson: JSON.stringify([
          { role: 'user', content: 'Earlier user message' },
          { role: 'assistant', content: 'Earlier assistant message' }
        ]),
        loadedActionsJson: JSON.stringify([{ key: 'pubmed', enabled: true }]),
        actionResultsJson: JSON.stringify([{ actionKey: 'pubmed', summary: 'found 2 papers' }]),
        responseStreamText: 'Final answer',
        responseEnvelopeJson: JSON.stringify({
          finalText: 'Final answer',
          chunks: ['Final answer']
        }),
        finalReplyMd: 'Final answer',
        errorMessage: null,
        createdAt: '2026-03-28T00:00:00.000Z',
        startedAt: '2026-03-28T00:00:00.100Z',
        finishedAt: '2026-03-28T00:00:01.000Z',
        updatedAt: '2026-03-28T00:00:01.000Z'
      }
    ],
    actionRuns: []
  }
}

describe('chat detail shell store', () => {
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

  it('opens a chat detail dialog with model call rows from persisted userdata snapshots', async () => {
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
    expect(store.formattedSelectedCallRequest).toContain('compiledPromptMarkdown')
    expect(store.formattedSelectedCallRequest).toContain('Summarize this turn.')
    expect(store.formattedSelectedCallResponse).toContain('responseStreamText')
    expect(store.formattedSelectedCallResponse).toContain('Final answer')
  })
})
