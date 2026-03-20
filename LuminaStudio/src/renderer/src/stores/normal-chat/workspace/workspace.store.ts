import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  NormalChatAgentTemplate,
  NormalChatAssistant,
  NormalChatTopic,
  NormalChatTopicPromptMode,
  NormalChatWorkspaceSnapshot
} from '@preload/types'
import {
  NormalChatWorkspaceDatasource,
  type NormalChatWorkspaceDatasourceLike
} from './workspace.datasource'

export type AssistantSettingsTab = 'model' | 'prompt' | 'kb' | 'mcp' | 'phrases' | 'memory'

export interface AssistantSettingsNavItem {
  id: AssistantSettingsTab
  label: string
}

export const NORMAL_CHAT_SETTINGS_NAV_ITEMS: AssistantSettingsNavItem[] = [
  { id: 'model', label: '模型设置' },
  { id: 'prompt', label: '提示词设置' },
  { id: 'kb', label: '知识库设置' },
  { id: 'mcp', label: 'MCP 服务器' },
  { id: 'phrases', label: '常用短语' },
  { id: 'memory', label: '全局记忆' }
]

function createEmptyWorkspaceSnapshot(): NormalChatWorkspaceSnapshot {
  return {
    assistants: [],
    topicsByAssistantId: {},
    activeAssistantId: '',
    activeTopicId: ''
  }
}

export function resolveEffectiveSystemPrompt(
  assistant: NormalChatAssistant | null,
  topic: NormalChatTopic | null
): string {
  if (!assistant) {
    return ''
  }

  if (!topic) {
    return assistant.defaultSystemPrompt
  }

  if (topic.systemPromptMode === 'override') {
    return topic.systemPromptOverride ?? ''
  }

  return assistant.defaultSystemPrompt
}

let datasource: NormalChatWorkspaceDatasourceLike = NormalChatWorkspaceDatasource

export function setNormalChatWorkspaceDatasourceForTesting(
  nextDatasource: NormalChatWorkspaceDatasourceLike
): void {
  datasource = nextDatasource
}

export function resetNormalChatWorkspaceDatasourceForTesting(): void {
  datasource = NormalChatWorkspaceDatasource
}

/**
 * Normal Chat 业务工作区 Store（SSOT）
 * 说明：
 * - 助手、话题、prompt 归属和 active 状态统一放这里
 * - 组件只消费 selector 和派发动作，不再各自维护业务 ref
 */
export const useNormalChatWorkspaceStore = defineStore('normal-chat-workspace', () => {
  const initialized = ref(false)
  const templates = ref<NormalChatAgentTemplate[]>([])
  const snapshot = ref<NormalChatWorkspaceSnapshot>(createEmptyWorkspaceSnapshot())

  const createAssistantDialogOpen = ref(false)
  const selectedTemplateKey = ref('')
  const assistantSettingsOpen = ref(false)
  const activeSettingsTab = ref<AssistantSettingsTab>('prompt')

  const assistantNameDraft = ref('')
  const assistantDefaultPromptDraft = ref('')
  const topicPromptModeDraft = ref<NormalChatTopicPromptMode>('inherit')
  const topicPromptOverrideDraft = ref('')

  const editingTopicId = ref('')
  const topicRenameDraft = ref('')

  const currentAssistant = computed(() => {
    return (
      snapshot.value.assistants.find(
        (assistant) => assistant.id === snapshot.value.activeAssistantId
      ) ?? null
    )
  })

  const currentTopics = computed(() => {
    return snapshot.value.topicsByAssistantId[snapshot.value.activeAssistantId] ?? []
  })

  const currentTopic = computed(() => {
    return currentTopics.value.find((topic) => topic.id === snapshot.value.activeTopicId) ?? null
  })

  const currentAssistantTemplate = computed(() => {
    if (!currentAssistant.value) {
      return null
    }
    return (
      templates.value.find((template) => template.key === currentAssistant.value?.templateKey) ??
      null
    )
  })

  const effectiveSystemPrompt = computed(() => {
    return resolveEffectiveSystemPrompt(currentAssistant.value, currentTopic.value)
  })

  const currentSettingsLabel = computed(() => {
    return (
      NORMAL_CHAT_SETTINGS_NAV_ITEMS.find((item) => item.id === activeSettingsTab.value)?.label ??
      '提示词设置'
    )
  })

  function applyWorkspaceSnapshot(nextSnapshot: NormalChatWorkspaceSnapshot): void {
    snapshot.value = nextSnapshot
    syncPromptDraftsFromSelection()
  }

  function syncPromptDraftsFromSelection(): void {
    assistantNameDraft.value = currentAssistant.value?.name ?? ''
    assistantDefaultPromptDraft.value = currentAssistant.value?.defaultSystemPrompt ?? ''
    topicPromptModeDraft.value = currentTopic.value?.systemPromptMode ?? 'inherit'
    topicPromptOverrideDraft.value = currentTopic.value?.systemPromptOverride ?? ''
  }

  async function initialize() {
    const bootstrap = await datasource.getBootstrap()
    templates.value = bootstrap.templates
    snapshot.value = bootstrap.workspace
    initialized.value = true
    selectedTemplateKey.value = bootstrap.templates[0]?.key ?? ''
    syncPromptDraftsFromSelection()
  }

  function openCreateAssistantDialog(): void {
    createAssistantDialogOpen.value = true
    selectedTemplateKey.value = templates.value[0]?.key ?? ''
  }

  function closeCreateAssistantDialog(): void {
    createAssistantDialogOpen.value = false
  }

  function setSelectedTemplateKey(templateKey: string): void {
    selectedTemplateKey.value = templateKey
  }

  async function confirmCreateAssistant() {
    if (!selectedTemplateKey.value) {
      return
    }

    const nextSnapshot = await datasource.createAssistant({
      templateKey: selectedTemplateKey.value
    })
    applyWorkspaceSnapshot(nextSnapshot)
    createAssistantDialogOpen.value = false
  }

  function openAssistantSettings(tab: AssistantSettingsTab = 'prompt'): void {
    activeSettingsTab.value = tab
    assistantSettingsOpen.value = true
    syncPromptDraftsFromSelection()
  }

  async function openAssistantSettingsForAssistant(
    assistantId: string,
    tab: AssistantSettingsTab = 'prompt'
  ) {
    if (assistantId && assistantId !== snapshot.value.activeAssistantId) {
      const nextSnapshot = await datasource.setActiveAssistant({ assistantId })
      applyWorkspaceSnapshot(nextSnapshot)
    }
    openAssistantSettings(tab)
  }

  function closeAssistantSettings(): void {
    assistantSettingsOpen.value = false
  }

  function setActiveSettingsTab(tab: AssistantSettingsTab): void {
    activeSettingsTab.value = tab
  }

  function setAssistantNameDraft(value: string): void {
    assistantNameDraft.value = value
  }

  function setAssistantDefaultPromptDraft(value: string): void {
    assistantDefaultPromptDraft.value = value
  }

  function setTopicPromptModeDraft(value: NormalChatTopicPromptMode): void {
    topicPromptModeDraft.value = value
  }

  function setTopicPromptOverrideDraft(value: string): void {
    topicPromptOverrideDraft.value = value
  }

  async function savePromptSettings() {
    if (!currentAssistant.value || !currentTopic.value) {
      return
    }

    let nextSnapshot = await datasource.updateAssistant({
      assistantId: currentAssistant.value.id,
      name: assistantNameDraft.value,
      defaultSystemPrompt: assistantDefaultPromptDraft.value
    })

    nextSnapshot = await datasource.updateTopicPrompt({
      assistantId: currentAssistant.value.id,
      topicId: currentTopic.value.id,
      mode: topicPromptModeDraft.value,
      promptOverride:
        topicPromptModeDraft.value === 'override' ? topicPromptOverrideDraft.value : null
    })

    applyWorkspaceSnapshot(nextSnapshot)
    assistantSettingsOpen.value = false
  }

  async function setActiveAssistant(assistantId: string) {
    const nextSnapshot = await datasource.setActiveAssistant({ assistantId })
    applyWorkspaceSnapshot(nextSnapshot)
  }

  async function setActiveTopic(topicId: string) {
    if (!snapshot.value.activeAssistantId) {
      return
    }

    const nextSnapshot = await datasource.setActiveTopic({
      assistantId: snapshot.value.activeAssistantId,
      topicId
    })
    applyWorkspaceSnapshot(nextSnapshot)
  }

  async function createTopic() {
    if (!snapshot.value.activeAssistantId) {
      return
    }

    const nextSnapshot = await datasource.createTopic({
      assistantId: snapshot.value.activeAssistantId
    })
    applyWorkspaceSnapshot(nextSnapshot)
  }

  async function deleteTopic(topicId: string) {
    if (!snapshot.value.activeAssistantId) {
      return
    }

    const nextSnapshot = await datasource.deleteTopic({
      assistantId: snapshot.value.activeAssistantId,
      topicId
    })
    applyWorkspaceSnapshot(nextSnapshot)
    cancelTopicRename()
  }

  function startTopicRename(topicId: string): void {
    const topic = currentTopics.value.find((item) => item.id === topicId)
    if (!topic) {
      return
    }

    editingTopicId.value = topicId
    topicRenameDraft.value = topic.title
  }

  function setTopicRenameDraft(value: string): void {
    topicRenameDraft.value = value
  }

  function cancelTopicRename(): void {
    editingTopicId.value = ''
    topicRenameDraft.value = ''
  }

  async function commitTopicRename(topicId: string) {
    if (!snapshot.value.activeAssistantId) {
      return
    }

    const nextTitle = topicRenameDraft.value.trim()
    const current = currentTopics.value.find((topic) => topic.id === topicId)
    if (!current) {
      cancelTopicRename()
      return
    }

    if (nextTitle.length === 0 || nextTitle === current.title) {
      cancelTopicRename()
      return
    }

    const nextSnapshot = await datasource.renameTopic({
      assistantId: snapshot.value.activeAssistantId,
      topicId,
      title: nextTitle
    })
    applyWorkspaceSnapshot(nextSnapshot)
    cancelTopicRename()
  }

  return {
    initialized,
    templates,
    snapshot,
    createAssistantDialogOpen,
    selectedTemplateKey,
    assistantSettingsOpen,
    activeSettingsTab,
    assistantNameDraft,
    assistantDefaultPromptDraft,
    topicPromptModeDraft,
    topicPromptOverrideDraft,
    editingTopicId,
    topicRenameDraft,
    currentAssistant,
    currentTopics,
    currentTopic,
    currentAssistantTemplate,
    effectiveSystemPrompt,
    currentSettingsLabel,
    settingsNavItems: NORMAL_CHAT_SETTINGS_NAV_ITEMS,
    initialize,
    openCreateAssistantDialog,
    closeCreateAssistantDialog,
    setSelectedTemplateKey,
    confirmCreateAssistant,
    openAssistantSettings,
    openAssistantSettingsForAssistant,
    closeAssistantSettings,
    setActiveSettingsTab,
    setAssistantNameDraft,
    setAssistantDefaultPromptDraft,
    setTopicPromptModeDraft,
    setTopicPromptOverrideDraft,
    savePromptSettings,
    setActiveAssistant,
    setActiveTopic,
    createTopic,
    deleteTopic,
    startTopicRename,
    setTopicRenameDraft,
    cancelTopicRename,
    commitTopicRename
  }
})
