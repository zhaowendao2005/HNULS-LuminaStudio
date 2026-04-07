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
            modelMode: 'inherit',
            modelProviderIdOverride: null,
            modelIdOverride: null,
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

function createDatasourceStub(overrides: Record<string, unknown> = {}) {
  return {
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
    updateTopicStreaming: vi.fn(),
    updateTopicConfig: vi.fn(),
    ...overrides
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
      models: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', group: 'default' }]
    },
    {
      id: 'provider-anthropic',
      type: 'claude',
      name: 'Anthropic',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
      icon: 'anthropic',
      enabled: true,
      models: [{ id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', group: 'default' }]
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
    const modelConfigStore = useModelConfigStore()
    modelConfigStore.providers = createModelProviders()
    setNormalChatWorkspaceDatasourceForTesting(createDatasourceStub())

    const store = useNormalChatWorkspaceStore()
    await store.initialize()

    expect(store.currentAssistant?.name).toBe('基础助手')
    expect(store.currentTopic?.title).toBe('默认话题')
    expect(store.effectiveSystemPrompt).toBe('默认提示词')
    expect(store.currentTopicModelLabel).toBe('GPT-4o Mini · OpenAI')
  })

  it('falls back to an available backend model when assistant default model is missing', async () => {
    const bootstrap = createBootstrap()
    bootstrap.workspace.assistants[0].defaultModelProviderId = 'missing-provider'
    bootstrap.workspace.assistants[0].defaultModelId = 'missing-model'

    const modelConfigStore = useModelConfigStore()
    modelConfigStore.providers = createModelProviders()

    setNormalChatWorkspaceDatasourceForTesting(
      createDatasourceStub({
        getBootstrap: vi.fn().mockResolvedValue(bootstrap)
      })
    )

    const store = useNormalChatWorkspaceStore()
    await store.initialize()

    expect(store.assistantDefaultModelProviderIdDraft).toBe('provider-openai')
    expect(store.assistantDefaultModelIdDraft).toBe('gpt-4o-mini')
    expect(store.currentTopicModelLabel).toBe('未选择模型')
  })

  it('commits inline topic rename and clears editing state', async () => {
    const renamedSnapshot: NormalChatWorkspaceSnapshot = {
      ...createBootstrap().workspace,
      topicsByAssistantId: {
        'assistant-1': [
          {
            ...createBootstrap().workspace.topicsByAssistantId['assistant-1'][0],
            title: '重命名后的话题'
          }
        ]
      }
    }

    const renameTopic = vi.fn().mockResolvedValue(renamedSnapshot)

    setNormalChatWorkspaceDatasourceForTesting(
      createDatasourceStub({
        renameTopic
      })
    )

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

  it('saves assistant default settings as assistant-level configuration', async () => {
    const modelConfigStore = useModelConfigStore()
    modelConfigStore.providers = createModelProviders()
    const updateAssistant = vi.fn().mockImplementation(async (payload) => {
      const bootstrap = createBootstrap()
      bootstrap.workspace.assistants[0] = {
        ...bootstrap.workspace.assistants[0],
        name: payload.name,
        defaultSystemPrompt: payload.defaultSystemPrompt,
        streamingEnabled: payload.streamingEnabled,
        costMode: payload.costMode,
        defaultModelProviderId: payload.defaultModelProviderId,
        defaultModelId: payload.defaultModelId,
        contextMemoryRounds: payload.contextMemoryRounds,
        maxRecursionDepth: payload.maxRecursionDepth,
        maxReasoningSteps: payload.maxReasoningSteps,
        systemActionFunctionCallEnabled: payload.systemActionFunctionCallEnabled,
        systemActionSubAgentEnabled: payload.systemActionSubAgentEnabled,
        functionCallPubMedEnabled: payload.functionCallPubMedEnabled,
        functionCallPubMedMode: payload.functionCallPubMedMode,
        mcpEnabled: payload.mcpEnabled,
        persistencePreset: payload.persistencePreset
      }
      return bootstrap.workspace
    })

    setNormalChatWorkspaceDatasourceForTesting(
      createDatasourceStub({
        updateAssistant
      })
    )

    const store = useNormalChatWorkspaceStore()
    await store.initialize()

    store.openAssistantSettings('assistant')
    store.setAssistantNameDraft('新的基础助手')
    store.setAssistantDefaultPromptDraft('新的默认提示词')
    store.setAssistantStreamingEnabledDraft(false)
    store.setAssistantCostModeDraft('per_call')
    store.setAssistantDefaultModelProviderIdDraft('provider-anthropic')
    store.setAssistantContextMemoryRoundsDraft(8)
    store.setAssistantMaxRecursionDepthDraft(4)
    store.setAssistantMaxReasoningStepsDraft(9)
    store.setAssistantFunctionCallPubMedEnabledDraft(false)
    store.setAssistantFunctionCallPubMedModeDraft('slow')
    store.setAssistantMcpEnabledDraft(true)
    store.setAssistantPersistencePresetDraft('full')
    await store.saveSettings()

    expect(updateAssistant).toHaveBeenCalledWith({
      assistantId: 'assistant-1',
      name: '新的基础助手',
      defaultSystemPrompt: '新的默认提示词',
      streamingEnabled: false,
      costMode: 'per_call',
      defaultModelProviderId: 'provider-anthropic',
      defaultModelId: 'claude-3-5-sonnet',
      contextMemoryRounds: 8,
      maxRecursionDepth: 4,
      maxReasoningSteps: 9,
      systemActionFunctionCallEnabled: true,
      systemActionSubAgentEnabled: true,
      functionCallPubMedEnabled: false,
      functionCallPubMedMode: 'slow',
      mcpEnabled: true,
      persistencePreset: 'full'
    })
  })

  it('auto switches topic draft between inherit and override based on edited values', async () => {
    const modelConfigStore = useModelConfigStore()
    modelConfigStore.providers = createModelProviders()
    const updateTopicConfig = vi.fn().mockResolvedValue(createBootstrap().workspace)

    setNormalChatWorkspaceDatasourceForTesting(
      createDatasourceStub({
        updateTopicConfig
      })
    )

    const store = useNormalChatWorkspaceStore()
    await store.initialize()

    store.openTopicSettings()

    store.setTopicPromptDraft('当前话题覆盖提示词')
    store.setTopicStreamingEnabledOverrideDraft(false)
    store.setTopicCostModeOverrideDraft('per_call')
    store.setTopicModelProviderIdOverrideDraft('provider-anthropic')
    store.setTopicContextMemoryRoundsOverrideDraft(4)
    store.setTopicMaxRecursionDepthOverrideDraft(1)
    store.setTopicMaxReasoningStepsOverrideDraft(3)
    store.setTopicFunctionCallPubMedEnabledOverrideDraft(false)
    store.setTopicFunctionCallPubMedExecutionModeOverrideDraft('slow')
    store.setTopicMcpEnabledOverrideDraft(true)

    expect(store.topicPromptModeDraft).toBe('override')
    expect(store.topicStreamingModeDraft).toBe('override')
    expect(store.topicCostModeDraft).toBe('override')
    expect(store.topicModelModeDraft).toBe('override')
    expect(store.topicContextMemoryRoundsModeDraft).toBe('override')
    expect(store.topicMaxRecursionDepthModeDraft).toBe('override')
    expect(store.topicMaxReasoningStepsModeDraft).toBe('override')
    expect(store.topicFunctionCallPubMedModeDraft).toBe('override')
    expect(store.topicFunctionCallPubMedExecutionModeDraft).toBe('override')
    expect(store.topicMcpModeDraft).toBe('override')

    store.setTopicPromptDraft('默认提示词')
    store.setTopicStreamingEnabledOverrideDraft(true)
    store.setTopicCostModeOverrideDraft('per_token')
    store.setTopicModelProviderIdOverrideDraft('provider-openai')
    store.setTopicContextMemoryRoundsOverrideDraft(12)
    store.setTopicMaxRecursionDepthOverrideDraft(2)
    store.setTopicMaxReasoningStepsOverrideDraft(6)
    store.setTopicFunctionCallPubMedEnabledOverrideDraft(true)
    store.setTopicFunctionCallPubMedExecutionModeOverrideDraft('fast')
    store.setTopicMcpEnabledOverrideDraft(false)

    expect(store.topicPromptModeDraft).toBe('inherit')
    expect(store.topicStreamingModeDraft).toBe('inherit')
    expect(store.topicCostModeDraft).toBe('inherit')
    expect(store.topicModelModeDraft).toBe('inherit')
    expect(store.topicContextMemoryRoundsModeDraft).toBe('inherit')
    expect(store.topicMaxRecursionDepthModeDraft).toBe('inherit')
    expect(store.topicMaxReasoningStepsModeDraft).toBe('inherit')
    expect(store.topicFunctionCallPubMedModeDraft).toBe('inherit')
    expect(store.topicFunctionCallPubMedExecutionModeDraft).toBe('inherit')
    expect(store.topicMcpModeDraft).toBe('inherit')

    await store.saveSettings()

    expect(updateTopicConfig).toHaveBeenCalledWith({
      assistantId: 'assistant-1',
      topicId: 'topic-1',
      systemPromptMode: 'inherit',
      systemPromptOverride: null,
      streamingMode: 'inherit',
      streamingEnabledOverride: null,
      costMode: 'inherit',
      costModeOverride: null,
      modelMode: 'inherit',
      modelProviderIdOverride: null,
      modelIdOverride: null,
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
      mcpEnabledOverride: null
    })
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
      },
      {
        id: 'assistant-2',
        name: '学习助手',
        emoji: '🧥',
        labelId: 'label-1',
        defaultSystemPrompt: '学习提示词',
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
        sortOrder: 1
      }
    ]

    setNormalChatWorkspaceDatasourceForTesting(
      createDatasourceStub({
        getBootstrap: vi.fn().mockResolvedValue(bootstrap)
      })
    )

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
