import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { NormalChatBootstrap, NormalChatWorkspaceSnapshot } from '@preload/types'
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
      assistants: [
        {
          id: 'assistant-1',
          templateKey: 'base-agent',
          name: '基础助手',
          emoji: '🤖',
          defaultSystemPrompt: '默认提示词',
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

describe('NormalChat workspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    resetNormalChatWorkspaceDatasourceForTesting()
    vi.restoreAllMocks()
  })

  it('hydrates selectors from bootstrap and resolves inherited prompts', async () => {
    setNormalChatWorkspaceDatasourceForTesting({
      getBootstrap: vi.fn().mockResolvedValue(createBootstrap()),
      createAssistant: vi.fn(),
      updateAssistant: vi.fn(),
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
    store.setTopicPromptModeDraft('override')
    store.setTopicPromptOverrideDraft('当前话题覆盖提示词')

    await store.savePromptSettings()

    expect(updateAssistant).toHaveBeenCalledWith({
      assistantId: 'assistant-1',
      name: '基础助手',
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
