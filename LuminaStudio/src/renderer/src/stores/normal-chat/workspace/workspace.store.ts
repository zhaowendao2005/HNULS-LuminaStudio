import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type {
  NormalChatAgentTemplate,
  NormalChatAssistant,
  NormalChatTopic,
  NormalChatWorkspaceSnapshot
} from '@preload/types'
import { useModelConfigStore } from '../../model-config/store'
import type { Model, ModelProvider } from '../../model-config/types'
import {
  NormalChatWorkspaceDatasource,
  type NormalChatWorkspaceDatasourceLike
} from './workspace.datasource'

export type AssistantSettingsTab =
  | 'basic'
  | 'model'
  | 'prompt'
  | 'kb'
  | 'mcp'
  | 'phrases'
  | 'memory'

export interface AssistantSettingsNavItem {
  id: AssistantSettingsTab
  label: string
}

export type PromptEditorScope = 'assistant' | 'topic'

export interface AssistantGroupItem {
  key: string
  labelId: string | null
  label: string
  assistants: NormalChatAssistant[]
}

interface TopicModelSelection {
  providerId: string
  modelId: string
}

interface ResolvedTopicModelSelection {
  provider: ModelProvider
  model: Model
}

type TopicModelSelectionMap = Record<string, TopicModelSelection>

const NORMAL_CHAT_SETTINGS_NAV_ITEMS: AssistantSettingsNavItem[] = [
  { id: 'basic', label: '基础设置' },
  { id: 'model', label: '模型设置' },
  { id: 'prompt', label: '提示词设置' },
  { id: 'kb', label: '知识库设置' },
  { id: 'mcp', label: 'MCP 服务器' },
  { id: 'phrases', label: '常用短语' },
  { id: 'memory', label: '全局记忆' }
]

const MODEL_SELECTION_STORAGE_KEY = 'normal-chat:model-selection:v1'

function createEmptyWorkspaceSnapshot(): NormalChatWorkspaceSnapshot {
  return {
    labels: [],
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

function getTopicModelSelectionKey(assistantId: string, topicId: string): string {
  return `${assistantId}::${topicId}`
}

function readModelSelectionMap(): TopicModelSelectionMap {
  if (typeof localStorage === 'undefined') {
    return {}
  }

  try {
    const raw = localStorage.getItem(MODEL_SELECTION_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    const result: TopicModelSelectionMap = {}
    Object.entries(parsed).forEach(([key, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return
      }

      const nextValue = value as { providerId?: unknown; modelId?: unknown }
      if (typeof nextValue.providerId !== 'string' || typeof nextValue.modelId !== 'string') {
        return
      }

      result[key] = {
        providerId: nextValue.providerId,
        modelId: nextValue.modelId
      }
    })
    return result
  } catch {
    return {}
  }
}

function persistModelSelectionMap(map: TopicModelSelectionMap): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(MODEL_SELECTION_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 本地存储不可用时不阻塞 Normal Chat。
  }
}

function resolveModelSelection(
  providers: ModelProvider[],
  selection: TopicModelSelection | undefined
): ResolvedTopicModelSelection | null {
  if (!selection) {
    return null
  }

  const provider = providers.find((item) => item.id === selection.providerId)
  if (!provider) {
    return null
  }

  const model = provider.models.find((item) => item.id === selection.modelId)
  if (!model) {
    return null
  }

  return {
    provider,
    model
  }
}

function buildModelLabel(selection: ResolvedTopicModelSelection | null): string {
  if (!selection) {
    return '未选择模型'
  }

  return `${selection.model.name || selection.model.id} · ${selection.model.id}`
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
 * - 当前话题的模型选择放在这里做本地持久化和后端校准
 */
export const useNormalChatWorkspaceStore = defineStore('normal-chat-workspace', () => {
  const modelConfigStore = useModelConfigStore()
  const initialized = ref(false)
  const templates = ref<NormalChatAgentTemplate[]>([])
  const snapshot = ref<NormalChatWorkspaceSnapshot>(createEmptyWorkspaceSnapshot())
  const modelSelectionMap = ref<TopicModelSelectionMap>({})

  const createAssistantDialogOpen = ref(false)
  const selectedTemplateKey = ref('')
  const assistantSettingsOpen = ref(false)
  const modelSelectorOpen = ref(false)
  const activeSettingsTab = ref<AssistantSettingsTab>('prompt')
  const promptEditorScope = ref<PromptEditorScope>('assistant')

  const assistantNameDraft = ref('')
  const assistantDefaultPromptDraft = ref('')
  const assistantSaveFullConversationDraft = ref(false)
  const topicPromptDraft = ref('')

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

  const currentConversationLabel = computed(() => {
    return `${currentAssistant.value?.name ?? '未选择助手'}--${currentTopic.value?.title ?? '未选择话题'}`
  })

  const currentTopicModelSelection = computed<ResolvedTopicModelSelection | null>(() => {
    if (!currentAssistant.value || !currentTopic.value) {
      return null
    }

    const topicKey = getTopicModelSelectionKey(currentAssistant.value.id, currentTopic.value.id)
    return resolveModelSelection(modelConfigStore.providers, modelSelectionMap.value[topicKey])
  })

  const currentTopicModelProviderId = computed(() => {
    return currentTopicModelSelection.value?.provider.id ?? null
  })

  const currentTopicModelId = computed(() => {
    return currentTopicModelSelection.value?.model.id ?? null
  })

  const currentTopicModelLabel = computed(() => {
    return buildModelLabel(currentTopicModelSelection.value)
  })

  const effectiveSystemPrompt = computed(() => {
    return resolveEffectiveSystemPrompt(currentAssistant.value, currentTopic.value)
  })

  const currentTopicUsesAssistantPrompt = computed(() => {
    return currentTopic.value?.systemPromptMode !== 'override'
  })

  const promptEditorIsInherited = computed(() => {
    if (promptEditorScope.value !== 'topic') {
      return false
    }

    return topicPromptDraft.value === (currentAssistant.value?.defaultSystemPrompt ?? '')
  })

  const assistantGroups = computed<AssistantGroupItem[]>(() => {
    const orderedGroups: AssistantGroupItem[] = [
      {
        key: 'uncategorized',
        labelId: null,
        label: '未分类',
        assistants: []
      }
    ]

    snapshot.value.labels.forEach((label) => {
      orderedGroups.push({
        key: label.id,
        labelId: label.id,
        label: label.name,
        assistants: []
      })
    })

    snapshot.value.assistants.forEach((assistant) => {
      const targetGroup =
        orderedGroups.find((group) => group.labelId === assistant.labelId) ?? orderedGroups[0]
      targetGroup.assistants.push(assistant)
    })

    return orderedGroups.filter((group) => group.assistants.length > 0 || group.labelId === null)
  })

  const currentSettingsLabel = computed(() => {
    if (activeSettingsTab.value === 'basic') {
      return '基础设置'
    }

    if (promptEditorScope.value === 'topic') {
      return '当前话题提示词'
    }

    return (
      NORMAL_CHAT_SETTINGS_NAV_ITEMS.find((item) => item.id === activeSettingsTab.value)?.label ??
      '提示词设置'
    )
  })

  function syncCurrentTopicModelSelection(): void {
    if (!currentAssistant.value || !currentTopic.value) {
      return
    }

    const topicKey = getTopicModelSelectionKey(currentAssistant.value.id, currentTopic.value.id)
    const storedSelection = modelSelectionMap.value[topicKey]
    const resolvedSelection = resolveModelSelection(modelConfigStore.providers, storedSelection)

    if (resolvedSelection) {
      if (
        storedSelection?.providerId !== resolvedSelection.provider.id ||
        storedSelection?.modelId !== resolvedSelection.model.id
      ) {
        modelSelectionMap.value = {
          ...modelSelectionMap.value,
          [topicKey]: {
            providerId: resolvedSelection.provider.id,
            modelId: resolvedSelection.model.id
          }
        }
        persistModelSelectionMap(modelSelectionMap.value)
      }
      return
    }

    const fallbackProvider =
      modelConfigStore.selectedProvider?.models.length &&
      modelConfigStore.selectedProvider.models.length > 0
        ? modelConfigStore.selectedProvider
        : (modelConfigStore.providers.find((provider) => provider.models.length > 0) ?? null)
    const fallbackModel = fallbackProvider?.models[0] ?? null
    if (!fallbackProvider || !fallbackModel) {
      return
    }

    const nextSelection = {
      providerId: fallbackProvider.id,
      modelId: fallbackModel.id
    }

    if (
      storedSelection?.providerId === nextSelection.providerId &&
      storedSelection?.modelId === nextSelection.modelId
    ) {
      return
    }

    modelSelectionMap.value = {
      ...modelSelectionMap.value,
      [topicKey]: nextSelection
    }
    persistModelSelectionMap(modelSelectionMap.value)
  }

  function applyWorkspaceSnapshot(nextSnapshot: NormalChatWorkspaceSnapshot): void {
    snapshot.value = nextSnapshot
    syncPromptDraftsFromSelection()
    syncCurrentTopicModelSelection()
  }

  function syncPromptDraftsFromSelection(): void {
    assistantNameDraft.value = currentAssistant.value?.name ?? ''
    assistantDefaultPromptDraft.value = currentAssistant.value?.defaultSystemPrompt ?? ''
    assistantSaveFullConversationDraft.value =
      currentAssistant.value?.saveFullConversationEnabled ?? false
    topicPromptDraft.value =
      currentTopic.value?.systemPromptMode === 'override'
        ? (currentTopic.value.systemPromptOverride ?? '')
        : (currentAssistant.value?.defaultSystemPrompt ?? '')
  }

  async function initialize() {
    const bootstrap = await datasource.getBootstrap()
    templates.value = bootstrap.templates
    snapshot.value = bootstrap.workspace
    modelSelectionMap.value = readModelSelectionMap()

    try {
      await modelConfigStore.fetchProviders()
    } catch {
      // 模型配置后端暂时不可用时，Normal Chat 先按本地状态继续运行。
    }

    initialized.value = true
    selectedTemplateKey.value = bootstrap.templates[0]?.key ?? ''
    syncPromptDraftsFromSelection()
    syncCurrentTopicModelSelection()
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

  function openAssistantSettings(
    tab: AssistantSettingsTab = 'prompt',
    scope: PromptEditorScope = 'assistant'
  ): void {
    activeSettingsTab.value = tab
    promptEditorScope.value = scope
    assistantSettingsOpen.value = true
    syncPromptDraftsFromSelection()
  }

  function openModelSelector(): void {
    syncCurrentTopicModelSelection()
    modelSelectorOpen.value = true
  }

  function closeModelSelector(): void {
    modelSelectorOpen.value = false
  }

  function selectCurrentTopicModel(providerId: string, modelId: string): void {
    if (!currentAssistant.value || !currentTopic.value) {
      return
    }

    const resolvedSelection = resolveModelSelection(modelConfigStore.providers, {
      providerId,
      modelId
    })
    if (!resolvedSelection) {
      return
    }

    const topicKey = getTopicModelSelectionKey(currentAssistant.value.id, currentTopic.value.id)
    modelSelectionMap.value = {
      ...modelSelectionMap.value,
      [topicKey]: {
        providerId: resolvedSelection.provider.id,
        modelId: resolvedSelection.model.id
      }
    }
    persistModelSelectionMap(modelSelectionMap.value)
  }

  async function openAssistantSettingsForAssistant(
    assistantId: string,
    tab: AssistantSettingsTab = 'basic'
  ) {
    if (assistantId && assistantId !== snapshot.value.activeAssistantId) {
      const nextSnapshot = await datasource.setActiveAssistant({ assistantId })
      applyWorkspaceSnapshot(nextSnapshot)
    }
    openAssistantSettings(tab, 'assistant')
  }

  function openTopicPromptEditor(): void {
    openAssistantSettings('prompt', 'topic')
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

  function setAssistantSaveFullConversationDraft(value: boolean): void {
    assistantSaveFullConversationDraft.value = value
  }

  function setTopicPromptDraft(value: string): void {
    topicPromptDraft.value = value
  }

  async function savePromptSettings() {
    if (!currentAssistant.value || !currentTopic.value) {
      return
    }

    let nextSnapshot = snapshot.value

    if (promptEditorScope.value === 'assistant') {
      nextSnapshot = await datasource.updateAssistant({
        assistantId: currentAssistant.value.id,
        defaultSystemPrompt: assistantDefaultPromptDraft.value
      })
    } else {
      const nextTopicPrompt = topicPromptDraft.value
      const shouldInherit =
        nextTopicPrompt.trim().length === 0 ||
        nextTopicPrompt === currentAssistant.value.defaultSystemPrompt

      nextSnapshot = await datasource.updateTopicPrompt({
        assistantId: currentAssistant.value.id,
        topicId: currentTopic.value.id,
        mode: shouldInherit ? 'inherit' : 'override',
        promptOverride: shouldInherit ? null : nextTopicPrompt
      })
    }

    applyWorkspaceSnapshot(nextSnapshot)
    assistantSettingsOpen.value = false
  }

  async function saveAssistantBasicSettings() {
    if (!currentAssistant.value) {
      return
    }

    await updateAssistantBasicSettings()
    assistantSettingsOpen.value = false
  }

  async function updateAssistantBasicSettings() {
    if (!currentAssistant.value) {
      return
    }

    const nextSnapshot = await datasource.updateAssistant({
      assistantId: currentAssistant.value.id,
      name: assistantNameDraft.value,
      saveFullConversationEnabled: assistantSaveFullConversationDraft.value
    })

    applyWorkspaceSnapshot(nextSnapshot)
  }

  async function assignAssistantLabel(assistantId: string, labelId: string | null) {
    const nextSnapshot = await datasource.assignLabel({ assistantId, labelId })
    applyWorkspaceSnapshot(nextSnapshot)
  }

  async function createLabel(name: string) {
    const nextSnapshot = await datasource.createLabel({ name })
    applyWorkspaceSnapshot(nextSnapshot)
  }

  async function renameLabel(labelId: string, name: string) {
    const nextSnapshot = await datasource.renameLabel({ labelId, name })
    applyWorkspaceSnapshot(nextSnapshot)
  }

  async function deleteLabel(labelId: string) {
    const nextSnapshot = await datasource.deleteLabel({ labelId })
    applyWorkspaceSnapshot(nextSnapshot)
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

  watch(
    () => modelConfigStore.providers,
    () => {
      if (!initialized.value) {
        return
      }

      syncCurrentTopicModelSelection()
    },
    { deep: true }
  )

  return {
    initialized,
    templates,
    snapshot,
    createAssistantDialogOpen,
    selectedTemplateKey,
    assistantSettingsOpen,
    modelSelectorOpen,
    activeSettingsTab,
    promptEditorScope,
    assistantNameDraft,
    assistantDefaultPromptDraft,
    assistantSaveFullConversationDraft,
    topicPromptDraft,
    editingTopicId,
    topicRenameDraft,
    currentAssistant,
    currentTopics,
    currentTopic,
    currentAssistantTemplate,
    currentConversationLabel,
    currentTopicModelSelection,
    currentTopicModelProviderId,
    currentTopicModelId,
    currentTopicModelLabel,
    effectiveSystemPrompt,
    currentTopicUsesAssistantPrompt,
    promptEditorIsInherited,
    assistantGroups,
    currentSettingsLabel,
    settingsNavItems: NORMAL_CHAT_SETTINGS_NAV_ITEMS,
    initialize,
    openCreateAssistantDialog,
    closeCreateAssistantDialog,
    setSelectedTemplateKey,
    confirmCreateAssistant,
    openAssistantSettings,
    openModelSelector,
    closeModelSelector,
    selectCurrentTopicModel,
    openAssistantSettingsForAssistant,
    openTopicPromptEditor,
    closeAssistantSettings,
    setActiveSettingsTab,
    setAssistantNameDraft,
    setAssistantDefaultPromptDraft,
    setAssistantSaveFullConversationDraft,
    setTopicPromptDraft,
    savePromptSettings,
    saveAssistantBasicSettings,
    updateAssistantBasicSettings,
    assignAssistantLabel,
    createLabel,
    renameLabel,
    deleteLabel,
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
