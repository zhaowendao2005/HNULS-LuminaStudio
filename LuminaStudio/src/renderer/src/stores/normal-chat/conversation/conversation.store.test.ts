import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  NormalChatBootstrap,
  NormalChatConversationMessage,
  NormalChatConversationStreamEvent
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
          saveFullConversationEnabled: false,
          streamingEnabled: true,
          callMode: 'auto',
          costMode: 'per_token',
          maxRecursionDepth: 2,
          maxRetriesPerAgent: 1,
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
      icon: 'openai',
      enabled: true,
      models: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', group: 'default' }]
    }
  ]
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

  it('sends only topicId/providerId/modelId/input and uses the main-committed user message', async () => {
    let streamHandler: ((event: NormalChatConversationStreamEvent) => void) | null = null
    const sendMessage = vi.fn().mockResolvedValue({
      requestId: 'request-1',
      message: {
        id: 'message-1',
        topicId: 'topic-1',
        requestId: 'request-1',
        role: 'user',
        parts: [{ kind: 'text', text: '你好' }],
        createdAt: '2026-03-24T00:00:00.000Z',
        updatedAt: '2026-03-24T00:00:00.000Z'
      } satisfies NormalChatConversationMessage
    })

    setNormalChatWorkspaceDatasourceForTesting({
      getBootstrap: vi.fn().mockResolvedValue(createBootstrap()),
      createAssistant: vi.fn(),
      updateAssistant: vi.fn(),
      assignLabel: vi.fn(),
      createLabel: vi.fn(),
      renameLabel: vi.fn(),
      deleteLabel: vi.fn(),
      setActiveAssistant: vi.fn(),
      createTopic: vi.fn(),
      renameTopic: vi.fn(),
      deleteTopic: vi.fn(),
      setActiveTopic: vi.fn(),
      updateTopicPrompt: vi.fn(),
      updateTopicStreaming: vi.fn()
    })

    setNormalChatConversationDatasourceForTesting({
      getConversation: vi.fn().mockResolvedValue({
        topicId: 'topic-1',
        messages: []
      }),
      getConversationTurnDetail: vi.fn().mockResolvedValue(null),
      sendMessage,
      deleteConversationTurn: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
      onStream(handler) {
        streamHandler = handler
        return () => {
          streamHandler = null
        }
      }
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
    expect(store.currentDisplayMessages.map((message) => message.id)).toEqual(['message-1'])

    if (streamHandler) {
      ;(streamHandler as (event: NormalChatConversationStreamEvent) => void)({
        type: 'finish',
        requestId: 'request-1',
        topicId: 'topic-1',
        assistantMessageId: null
      })
    }

    expect(store.isCurrentTopicStreaming).toBe(false)
  })

  it('stores raw error json from the stream event for the composer error dialog', async () => {
    let streamHandler: ((event: NormalChatConversationStreamEvent) => void) | null = null

    setNormalChatWorkspaceDatasourceForTesting({
      getBootstrap: vi.fn().mockResolvedValue(createBootstrap()),
      createAssistant: vi.fn(),
      updateAssistant: vi.fn(),
      assignLabel: vi.fn(),
      createLabel: vi.fn(),
      renameLabel: vi.fn(),
      deleteLabel: vi.fn(),
      setActiveAssistant: vi.fn(),
      createTopic: vi.fn(),
      renameTopic: vi.fn(),
      deleteTopic: vi.fn(),
      setActiveTopic: vi.fn(),
      updateTopicPrompt: vi.fn(),
      updateTopicStreaming: vi.fn()
    })

    setNormalChatConversationDatasourceForTesting({
      getConversation: vi.fn().mockResolvedValue({
        topicId: 'topic-1',
        messages: []
      }),
      getConversationTurnDetail: vi.fn().mockResolvedValue(null),
      sendMessage: vi.fn().mockResolvedValue({
        requestId: 'request-1',
        message: {
          id: 'message-1',
          topicId: 'topic-1',
          requestId: 'request-1',
          role: 'user',
          parts: [{ kind: 'text', text: '你好' }],
          createdAt: '2026-03-24T00:00:00.000Z',
          updatedAt: '2026-03-24T00:00:00.000Z'
        } satisfies NormalChatConversationMessage
      }),
      deleteConversationTurn: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
      onStream(handler) {
        streamHandler = handler
        return () => {
          streamHandler = null
        }
      }
    })

    const workspaceStore = useNormalChatWorkspaceStore()
    await workspaceStore.initialize()

    const store = useNormalChatConversationStore()
    await store.initialize()
    store.setDraftText('你好')
    await store.sendCurrentDraft()

    if (streamHandler) {
      ;(streamHandler as (event: NormalChatConversationStreamEvent) => void)({
        type: 'error',
        requestId: 'request-1',
        topicId: 'topic-1',
        message: '上游请求失败：HTTP 400 Invalid JSON payload received',
        rawErrorJson: JSON.stringify(
          {
            error: {
              code: 400,
              message: 'Invalid JSON payload received'
            }
          },
          null,
          2
        )
      })
    }

    expect(store.currentLastError).toContain('HTTP 400')
    expect(store.currentLastErrorDetail).toContain('Invalid JSON payload received')
  })
})
