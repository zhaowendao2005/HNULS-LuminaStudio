import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  NormalChatBootstrap,
  NormalChatConversationMessage,
  NormalChatRequestHeadSnapshot,
  NormalChatTopicTranscriptSnapshot
} from '@preload/types'
import { useModelConfigStore } from '../../model-config/store'
import type { ModelProvider } from '../../model-config/types'
import {
  resetNormalChatWorkspaceDatasourceForTesting,
  setNormalChatWorkspaceDatasourceForTesting,
  useNormalChatWorkspaceStore
} from '../workspace/workspace.store'
import {
  resetNormalChatConversationDatasourceForTesting,
  setNormalChatConversationDatasourceForTesting
} from './conversation.datasource'
import { useNormalChatConversationStore } from './conversation.store'

interface LocalStorageMock {
  clear(): void
  getItem(key: string): string | null
  key(index: number): string | null
  removeItem(key: string): void
  setItem(key: string, value: string): void
}

function createLocalStorageMock(): LocalStorageMock {
  const storage = new Map<string, string>()

  return {
    clear() {
      storage.clear()
    },
    getItem(key: string) {
      return storage.get(key) ?? null
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null
    },
    removeItem(key: string) {
      storage.delete(key)
    },
    setItem(key: string, value: string) {
      storage.set(key, value)
    }
  }
}

function createBootstrap(): NormalChatBootstrap {
  return {
    workspace: {
      labels: [],
      assistants: [
        {
          id: 'assistant-1',
          name: '基础助手',
          emoji: '🤖',
          labelId: null,
          defaultSystemPrompt: '默认提示词',
          streamingEnabled: true,
          callMode: 'auto',
          costMode: 'per_token',
          defaultModelProviderId: 'provider-openai',
          defaultModelId: 'gpt-4o-mini',
          contextMemoryRounds: 12,
          maxRecursionDepth: 2,
          maxReasoningSteps: 6,
          systemActionFunctionCallEnabled: true,
          systemActionSubAgentEnabled: true,
          functionCallPubMedEnabled: true,
          functionCallPubMedMode: 'fast',
          mcpEnabled: false,
          persistencePreset: 'light',
          sortOrder: 0
        }
      ],
      topicsByAssistantId: {
        'assistant-1': [
          {
            id: 'topic-1',
            assistantId: 'assistant-1',
            title: '默认话题',
            systemPromptMode: 'inherit',
            systemPromptOverride: null,
            streamingMode: 'inherit',
            streamingEnabledOverride: null,
            costMode: 'inherit',
            costModeOverride: null,
            modelMode: 'override',
            modelProviderIdOverride: 'provider-openai',
            modelIdOverride: 'gpt-4o-mini',
            contextMemoryRoundsMode: 'inherit',
            contextMemoryRoundsOverride: null,
            maxRecursionDepthMode: 'inherit',
            maxRecursionDepthOverride: null,
            maxReasoningStepsMode: 'inherit',
            maxReasoningStepsOverride: null,
            systemActionFunctionCallMode: 'inherit',
            systemActionFunctionCallEnabledOverride: null,
            systemActionSubAgentMode: 'inherit',
            systemActionSubAgentEnabledOverride: null,
            functionCallPubMedMode: 'inherit',
            functionCallPubMedEnabledOverride: null,
            functionCallPubMedExecutionMode: 'inherit',
            functionCallPubMedExecutionModeOverride: null,
            mcpMode: 'inherit',
            mcpEnabledOverride: null,
            sortOrder: 0
          }
        ]
      },
      activeAssistantId: 'assistant-1',
      activeTopicId: 'topic-1'
    }
  }
}

function createModelProviders(): ModelProvider[] {
  return [
    {
      id: 'provider-openai',
      type: 'openai',
      name: 'OpenAI',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      officialWebsite: 'https://openai.com',
      icon: 'openai',
      enabled: true,
      models: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', group: 'default' }]
    }
  ]
}

function createUserMessage(requestId: string, text: string): NormalChatConversationMessage {
  return {
    id: `user-${requestId}`,
    topicId: 'topic-1',
    requestId,
    role: 'user',
    parts: [{ kind: 'text', text }],
    createdAt: '2026-03-24T00:00:00.000Z',
    updatedAt: '2026-03-24T00:00:00.000Z'
  }
}

function createHead(
  requestId: string,
  overrides: Partial<NormalChatRequestHeadSnapshot> = {}
): NormalChatRequestHeadSnapshot {
  return {
    requestId,
    assistantId: 'assistant-1',
    topicId: 'topic-1',
    conversationId: 'conversation-1',
    rootAgentRunId: null,
    userMessageId: `user-${requestId}`,
    assistantMessageId: null,
    status: 'queued',
    phase: 'queued',
    errorMessage: null,
    createdAt: '2026-03-24T00:00:00.000Z',
    startedAt: null,
    finishedAt: null,
    updatedAt: '2026-03-24T00:00:00.000Z',
    lastEntrySeq: null,
    ...overrides
  }
}

function createTranscriptSnapshot(
  input: {
    messages?: NormalChatConversationMessage[]
    requestHeads?: NormalChatRequestHeadSnapshot[]
    highWatermark?: number
  } = {}
): NormalChatTopicTranscriptSnapshot {
  return {
    topicId: 'topic-1',
    messages: input.messages ?? [],
    requestHeads: input.requestHeads ?? [],
    highWatermark: input.highWatermark ?? 0
  }
}

function installWorkspaceDatasource(): void {
  setNormalChatWorkspaceDatasourceForTesting({
    getBootstrap: vi.fn().mockResolvedValue(createBootstrap()),
    createAssistant: vi.fn(),
    updateAssistant: vi.fn(),
    assignLabel: vi.fn(),
    createLabel: vi.fn(),
    renameLabel: vi.fn(),
    deleteLabel: vi.fn(),
    setActiveAssistant: vi.fn(),
    deleteAssistant: vi.fn(),
    createTopic: vi.fn(),
    renameTopic: vi.fn(),
    deleteTopic: vi.fn(),
    setActiveTopic: vi.fn(),
    updateTopicPrompt: vi.fn(),
    updateTopicStreaming: vi.fn(),
    updateTopicConfig: vi.fn().mockResolvedValue(createBootstrap().workspace)
  })
}

describe('NormalChat conversation store', () => {
  let localStorageMock: LocalStorageMock

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorageMock)

    const modelConfigStore = useModelConfigStore()
    modelConfigStore.providers = createModelProviders()
    localStorageMock.setItem(
      'normal-chat:model-selection:v1',
      JSON.stringify({
        'assistant-1::topic-1': {
          providerId: 'provider-openai',
          modelId: 'gpt-4o-mini'
        }
      })
    )
  })

  afterEach(() => {
    resetNormalChatWorkspaceDatasourceForTesting()
    resetNormalChatConversationDatasourceForTesting()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends only topicId/providerId/modelId/input and stops streaming after transcript refresh', async () => {
    installWorkspaceDatasource()

    let topicTraceHandler: (() => void) | null = null
    const getTopicTranscript = vi
      .fn()
      .mockResolvedValueOnce(createTranscriptSnapshot())
      .mockResolvedValueOnce(
        createTranscriptSnapshot({
          messages: [createUserMessage('request-1', '你好')],
          requestHeads: [createHead('request-1', { status: 'queued' })],
          highWatermark: 1
        })
      )
      .mockResolvedValueOnce(
        createTranscriptSnapshot({
          messages: [
            createUserMessage('request-1', '你好'),
            {
              id: 'assistant-1',
              topicId: 'topic-1',
              requestId: 'request-1',
              role: 'assistant',
              parts: [{ kind: 'text', text: '世界' }],
              createdAt: '2026-03-24T00:00:01.000Z',
              updatedAt: '2026-03-24T00:00:01.000Z'
            }
          ],
          requestHeads: [
            createHead('request-1', {
              status: 'succeeded',
              phase: 'finished',
              assistantMessageId: 'assistant-1',
              finishedAt: '2026-03-24T00:00:01.000Z'
            })
          ],
          highWatermark: 2
        })
      )

    const sendMessage = vi.fn().mockResolvedValue({
      requestId: 'request-1',
      message: createUserMessage('request-1', '你好')
    })

    setNormalChatConversationDatasourceForTesting({
      getConversation: vi.fn().mockResolvedValue({ topicId: 'topic-1', messages: [] }),
      getTopicTranscript,
      getRequestDebugSnapshot: vi.fn(),
      sendMessage,
      deleteConversationTurn: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
      onStream: vi.fn().mockImplementation(() => () => undefined),
      onTopicTraceEntry: vi.fn().mockImplementation((_topicId, handler) => {
        topicTraceHandler = handler
        return () => {
          topicTraceHandler = null
        }
      }),
      onRequestTraceEntry: vi.fn().mockImplementation(() => () => undefined)
    })

    const workspaceStore = useNormalChatWorkspaceStore()
    await workspaceStore.initialize()
    const store = useNormalChatConversationStore()
    await store.initialize()
    store.setDraftText('你好')
    await store.sendCurrentDraft()

    expect(sendMessage).toHaveBeenCalledWith({
      topicId: 'topic-1',
      providerId: 'provider-openai',
      modelId: 'gpt-4o-mini',
      input: '你好'
    })
    expect(store.isCurrentTopicStreaming).toBe(true)

    topicTraceHandler?.()
    await store.loadTopicConversation('topic-1')

    expect(store.isCurrentTopicStreaming).toBe(false)
    expect(store.currentDisplayMessages.map((message) => message.id)).toEqual([
      'user-request-1',
      'assistant-1'
    ])
  })

  it('renders transcript blocks from refreshed snapshots instead of stream overlays', async () => {
    installWorkspaceDatasource()

    let topicTraceHandler: (() => void) | null = null
    const getTopicTranscript = vi
      .fn()
      .mockResolvedValueOnce(createTranscriptSnapshot())
      .mockResolvedValueOnce(
        createTranscriptSnapshot({
          messages: [createUserMessage('request-2', '继续')],
          requestHeads: [createHead('request-2', { status: 'running', phase: 'awaiting_model' })],
          highWatermark: 1
        })
      )
      .mockResolvedValueOnce(
        createTranscriptSnapshot({
          messages: [
            createUserMessage('request-2', '继续'),
            {
              id: 'assistant-2',
              topicId: 'topic-1',
              requestId: 'request-2',
              role: 'assistant',
              parts: [
                { kind: 'text', text: '第一轮正文' },
                {
                  kind: 'functioncall',
                  callId: 'pubmed-2',
                  functionCallName: 'functioncall.pubmed_search',
                  title: 'PubMed Search',
                  status: 'success',
                  input: '{}',
                  output: '{}',
                  errorMessage: null,
                  isStreaming: false,
                  roundIndex: 1,
                  batchIndex: 0,
                  parallelIndex: 0,
                  depth: 0,
                  decisionReason: null
                },
                {
                  kind: 'functioncall',
                  callId: 'dispatch-2',
                  functionCallName: 'system.dispatch_sub_agent',
                  title: 'system.dispatch_sub_agent',
                  status: 'running',
                  input: '',
                  output: '',
                  errorMessage: null,
                  isStreaming: true,
                  roundIndex: 1,
                  batchIndex: 1,
                  parallelIndex: 0,
                  depth: 1,
                  decisionReason: '先创建并监听子代理'
                },
                { kind: 'text', text: '第二轮正文' }
              ],
              createdAt: '2026-03-24T00:00:01.000Z',
              updatedAt: '2026-03-24T00:00:01.000Z'
            }
          ],
          requestHeads: [
            createHead('request-2', { status: 'running', phase: 'executing_actions' })
          ],
          highWatermark: 2
        })
      )

    setNormalChatConversationDatasourceForTesting({
      getConversation: vi.fn().mockResolvedValue({ topicId: 'topic-1', messages: [] }),
      getTopicTranscript,
      getRequestDebugSnapshot: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue({
        requestId: 'request-2',
        message: createUserMessage('request-2', '继续')
      }),
      deleteConversationTurn: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
      onStream: vi.fn().mockImplementation(() => () => undefined),
      onTopicTraceEntry: vi.fn().mockImplementation((_topicId, handler) => {
        topicTraceHandler = handler
        return () => {
          topicTraceHandler = null
        }
      }),
      onRequestTraceEntry: vi.fn().mockImplementation(() => () => undefined)
    })

    const workspaceStore = useNormalChatWorkspaceStore()
    await workspaceStore.initialize()
    const store = useNormalChatConversationStore()
    await store.initialize()
    store.setDraftText('继续')
    await store.sendCurrentDraft()
    topicTraceHandler?.()
    await store.loadTopicConversation('topic-1')

    const assistantMessage = store.currentDisplayMessages[1]
    expect(assistantMessage?.text).toBe('第一轮正文\n\n第二轮正文')
    expect(assistantMessage?.blocks.some((block) => block.kind === 'function-batch')).toBe(true)
    expect(assistantMessage?.blocks.some((block) => block.kind === 'subagent')).toBe(true)
  })

  it('shows placeholder blocks for running requests without assistant content', async () => {
    installWorkspaceDatasource()

    const getTopicTranscript = vi.fn().mockResolvedValue(
      createTranscriptSnapshot({
        messages: [
          createUserMessage('request-3', '先占位'),
          {
            id: 'pending-assistant:request-3',
            topicId: 'topic-1',
            requestId: 'request-3',
            role: 'assistant',
            parts: [],
            createdAt: '2026-03-24T00:00:01.000Z',
            updatedAt: '2026-03-24T00:00:01.000Z'
          }
        ],
        requestHeads: [createHead('request-3', { status: 'running', phase: 'awaiting_model' })],
        highWatermark: 1
      })
    )

    setNormalChatConversationDatasourceForTesting({
      getConversation: vi.fn().mockResolvedValue({ topicId: 'topic-1', messages: [] }),
      getTopicTranscript,
      getRequestDebugSnapshot: vi.fn(),
      sendMessage: vi.fn(),
      deleteConversationTurn: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
      onStream: vi.fn().mockImplementation(() => () => undefined),
      onTopicTraceEntry: vi.fn().mockImplementation(() => () => undefined),
      onRequestTraceEntry: vi.fn().mockImplementation(() => () => undefined)
    })

    const workspaceStore = useNormalChatWorkspaceStore()
    await workspaceStore.initialize()
    const store = useNormalChatConversationStore()
    await store.initialize()

    expect(store.currentStatusText).toBe('模型响应中…')
    expect(store.currentDisplayMessages[1]?.blocks[0]?.kind).toBe('placeholder')
  })

  it('stores transcript load failures in the composer error state', async () => {
    installWorkspaceDatasource()

    const getTopicTranscript = vi.fn().mockRejectedValue(new Error('HTTP 400 Invalid JSON payload'))

    setNormalChatConversationDatasourceForTesting({
      getConversation: vi.fn().mockResolvedValue({ topicId: 'topic-1', messages: [] }),
      getTopicTranscript,
      getRequestDebugSnapshot: vi.fn(),
      sendMessage: vi.fn(),
      deleteConversationTurn: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
      onStream: vi.fn().mockImplementation(() => () => undefined),
      onTopicTraceEntry: vi.fn().mockImplementation(() => () => undefined),
      onRequestTraceEntry: vi.fn().mockImplementation(() => () => undefined)
    })

    const workspaceStore = useNormalChatWorkspaceStore()
    await workspaceStore.initialize()
    const store = useNormalChatConversationStore()
    await store.initialize()

    expect(store.currentLastError).toContain('HTTP 400')
    expect(store.currentLastErrorDetail).toBe('')
  })
})
