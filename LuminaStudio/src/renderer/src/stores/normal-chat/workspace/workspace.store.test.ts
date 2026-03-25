import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NormalChatBootstrap, NormalChatWorkspaceSnapshot } from '@preload/types'
import { useModelConfigStore } from '../../model-config/store'
import type { ModelProvider } from '../../model-config/types'
import {
  resetNormalChatWorkspaceDatasourceForTesting,
  resolveEffectiveSystemPrompt,
  setNormalChatWorkspaceDatasourceForTesting,
  useNormalChatWorkspaceStore
} from './workspace.store'

function createBootstrap(): NormalChatBootstrap {
  return {
    templates: [
      {
        key: 'base-agent',
        title: '基础助手',
        description: '通用聊天助手模板',
        emoji: '🤖'
      }
    ],
    workspace: {
      labels: [],
      assistants: [
        {
          id: 'assistant-1',
          templateKey: 'base-agent',
          name: '基础助手',
          emoji: '🤖',
          labelId: null,
          defaultSystemPrompt: '默认提示词',
          saveFullConversationEnabled: false,
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
            sortOrder: 0
          }
        ]
      },
      activeAssistantId: 'assistant-1',
      activeTopicId: 'topic-1'
    }
  }
}

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
      models: [
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          group: 'default'
        }
      ]
    },
    {
      id: 'provider-anthropic',
      type: 'claude',
      name: 'Anthropic',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
      icon: 'anthropic',
      enabled: true,
      models: [
        {
          id: 'claude-3-5-sonnet',
          name: 'Claude 3.5 Sonnet',
          group: 'default'
        }
      ]
    }
  ]
}

describe('NormalChat workspace store', () => {
  let localStorageMock: LocalStorageMock

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorageMock)
  })

  afterEach(() => {
    resetNormalChatWorkspaceDatasourceForTesting()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('hydrates selectors from bootstrap and resolves inherited prompts', async () => {
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
      updateTopicPrompt: vi.fn()
    })

    const store = useNormalChatWorkspaceStore()
    await store.initialize()

    expect(store.currentAssistant?.name).toBe('基础助手')
    expect(store.currentTopic?.title).toBe('默认话题')
    expect(store.effectiveSystemPrompt).toBe('默认提示词')
  })

  it('hydrates topic model selection from localStorage and backend providers', async () => {
    const modelConfigStore = useModelConfigStore()
    modelConfigStore.providers = createModelProviders()
    localStorageMock.setItem(
      'normal-chat:model-selection:v1',
      JSON.stringify({
        'assistant-1::topic-1': {
          providerId: 'provider-anthropic',
          modelId: 'claude-3-5-sonnet'
        }
      })
    )

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
      updateTopicPrompt: vi.fn()
    })

    const store = useNormalChatWorkspaceStore()
    await store.initialize()

    expect(store.currentTopicModelProviderId).toBe('provider-anthropic')
    expect(store.currentTopicModelId).toBe('claude-3-5-sonnet')
    expect(store.currentTopicModelLabel).toBe('Claude 3.5 Sonnet · claude-3-5-sonnet')
  })

  it('falls back to an available backend model when the stored selection is invalid', async () => {
    const modelConfigStore = useModelConfigStore()
    modelConfigStore.providers = createModelProviders()
    localStorageMock.setItem(
      'normal-chat:model-selection:v1',
      JSON.stringify({
        'assistant-1::topic-1': {
          providerId: 'missing-provider',
          modelId: 'missing-model'
        }
      })
    )

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
      updateTopicPrompt: vi.fn()
    })

    const store = useNormalChatWorkspaceStore()
    await store.initialize()

    expect(store.currentTopicModelProviderId).toBe('provider-openai')
    expect(store.currentTopicModelId).toBe('gpt-4o-mini')
    expect(JSON.parse(localStorageMock.getItem('normal-chat:model-selection:v1') || '{}')).toEqual({
      'assistant-1::topic-1': {
        providerId: 'provider-openai',
        modelId: 'gpt-4o-mini'
      }
    })
  })

  it('commits inline topic rename and clears editing state', async () => {
    const renamedSnapshot: NormalChatWorkspaceSnapshot = {
      ...createBootstrap().workspace,
      topicsByAssistantId: {
        'assistant-1': [
          {
            id: 'topic-1',
            assistantId: 'assistant-1',
            title: '重命名后的话题',
            systemPromptMode: 'inherit',
            systemPromptOverride: null,
            sortOrder: 0
          }
        ]
      }
    }

    const renameTopic = vi.fn().mockResolvedValue(renamedSnapshot)

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
      renameTopic,
      deleteTopic: vi.fn(),
      setActiveTopic: vi.fn(),
      updateTopicPrompt: vi.fn()
    })

    const store = useNormalChatWorkspaceStore()
    await store.initialize()

    store.startTopicRename('topic-1')
    store.setTopicRenameDraft('重命名后的话题')
    await store.commitTopicRename('topic-1')

    expect(renameTopic).toHaveBeenCalledWith({
      assistantId: 'assistant-1',
      topicId: 'topic-1',
      title: '重命名后的话题'
    })
    expect(store.editingTopicId).toBe('')
    expect(store.currentTopic?.title).toBe('重命名后的话题')
  })

  it('saves assistant default prompt and topic override in order', async () => {
    const updateAssistant = vi.fn().mockImplementation(async () => {
      const bootstrap = createBootstrap()
      bootstrap.workspace.assistants[0].defaultSystemPrompt = '更新后的默认提示词'
      return bootstrap.workspace
    })

    const updateTopicPrompt = vi.fn().mockImplementation(async () => {
      const bootstrap = createBootstrap()
      bootstrap.workspace.assistants[0].defaultSystemPrompt = '更新后的默认提示词'
      bootstrap.workspace.topicsByAssistantId['assistant-1'][0] = {
        ...bootstrap.workspace.topicsByAssistantId['assistant-1'][0],
        systemPromptMode: 'override',
        systemPromptOverride: '当前话题覆盖提示词'
      }
      return bootstrap.workspace
    })

    setNormalChatWorkspaceDatasourceForTesting({
      getBootstrap: vi.fn().mockResolvedValue(createBootstrap()),
      createAssistant: vi.fn(),
      updateAssistant,
      assignLabel: vi.fn(),
      createLabel: vi.fn(),
      renameLabel: vi.fn(),
      deleteLabel: vi.fn(),
      setActiveAssistant: vi.fn(),
      createTopic: vi.fn(),
      renameTopic: vi.fn(),
      deleteTopic: vi.fn(),
      setActiveTopic: vi.fn(),
      updateTopicPrompt
    })

    const store = useNormalChatWorkspaceStore()
    await store.initialize()
    store.setAssistantDefaultPromptDraft('更新后的默认提示词')
    await store.savePromptSettings()

    store.openTopicPromptEditor()
    store.setTopicPromptDraft('当前话题覆盖提示词')
    await store.savePromptSettings()

    expect(updateAssistant).toHaveBeenCalledWith({
      assistantId: 'assistant-1',
      defaultSystemPrompt: '更新后的默认提示词'
    })
    expect(updateTopicPrompt).toHaveBeenCalledWith({
      assistantId: 'assistant-1',
      topicId: 'topic-1',
      mode: 'override',
      promptOverride: '当前话题覆盖提示词'
    })
    expect(store.effectiveSystemPrompt).toBe('当前话题覆盖提示词')
  })

  it('groups assistants by label and keeps unclassified first', async () => {
    const bootstrap = createBootstrap()
    bootstrap.workspace.labels = [
      { id: 'label-1', name: '学习', sortOrder: 0 },
      { id: 'label-2', name: '写作', sortOrder: 1 }
    ]
    bootstrap.workspace.assistants = [
      {
        id: 'assistant-1',
        templateKey: 'base-agent',
        name: '基础助手',
        emoji: '🤖',
        labelId: null,
        defaultSystemPrompt: '默认提示词',
        saveFullConversationEnabled: false,
        callMode: 'auto',
        costMode: 'per_token',
        maxRecursionDepth: 2,
        maxRetriesPerAgent: 1,
        sortOrder: 0
      },
      {
        id: 'assistant-2',
        templateKey: 'base-agent',
        name: '学习助手',
        emoji: '🧠',
        labelId: 'label-1',
        defaultSystemPrompt: '学习提示词',
        saveFullConversationEnabled: false,
        callMode: 'auto',
        costMode: 'per_token',
        maxRecursionDepth: 2,
        maxRetriesPerAgent: 1,
        sortOrder: 1
      }
    ]

    setNormalChatWorkspaceDatasourceForTesting({
      getBootstrap: vi.fn().mockResolvedValue(bootstrap),
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
      updateTopicPrompt: vi.fn()
    })

    const store = useNormalChatWorkspaceStore()
    await store.initialize()

    expect(store.assistantGroups.map((group) => group.label)).toEqual(['未分类', '学习'])
    expect(store.assistantGroups[0].assistants.map((assistant) => assistant.name)).toEqual([
      '基础助手'
    ])
    expect(store.assistantGroups[1].assistants.map((assistant) => assistant.name)).toEqual([
      '学习助手'
    ])
  })

  it('prefers topic override prompt over assistant default prompt', () => {
    const assistant = createBootstrap().workspace.assistants[0]
    const topic = {
      ...createBootstrap().workspace.topicsByAssistantId['assistant-1'][0],
      systemPromptMode: 'override' as const,
      systemPromptOverride: '覆盖提示词'
    }

    expect(resolveEffectiveSystemPrompt(assistant, topic)).toBe('覆盖提示词')
  })
})
