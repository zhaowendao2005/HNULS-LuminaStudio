import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  NormalChatAssistant,
  NormalChatCostMode,
  NormalChatFunctionCallMode,
  NormalChatPersistencePreset,
  NormalChatTopic,
  NormalChatWorkspaceSnapshot
} from '@preload/types'
import { useModelConfigStore } from '../../model-config/store'
import type { Model, ModelProvider } from '../../model-config/types'
import {
  NormalChatWorkspaceDatasource,
  type NormalChatWorkspaceDatasourceLike
} from './workspace.datasource'

export type SettingsScope = 'assistant' | 'topic'
export type AssistantSettingsTab = 'basic' | 'model' | 'prompt' | 'action'
export type AssistantActionItemId =
  | 'system-functioncall'
  | 'system-subagent'
  | 'functioncall-pubmed'
  | 'mcp-default'

type InheritMode = 'inherit' | 'override'

export interface AssistantSettingsNavItem {
  id: AssistantSettingsTab
  label: string
}

export interface AssistantGroupItem {
  key: string
  labelId: string | null
  label: string
  assistants: NormalChatAssistant[]
}

interface ResolvedTopicModelSelection {
  provider: ModelProvider
  model: Model
}

const SETTINGS_NAV_ITEMS: AssistantSettingsNavItem[] = [
  { id: 'basic', label: '基础设置' },
  { id: 'model', label: '模型设置' },
  { id: 'prompt', label: '提示词设置' },
  { id: 'action', label: 'Action 设置' }
]

const DEFAULT_ACTION_EXPANDED_MAP: Record<AssistantActionItemId, boolean> = {
  'system-functioncall': false,
  'system-subagent': false,
  'functioncall-pubmed': false,
  'mcp-default': false
}

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

  if (!topic || topic.systemPromptMode !== 'override') {
    return assistant.defaultSystemPrompt
  }

  return topic.systemPromptOverride ?? ''
}

function resolveEffectiveBoolean(
  assistantValue: boolean,
  mode: InheritMode,
  overrideValue: boolean | null
): boolean {
  if (mode !== 'override') {
    return assistantValue
  }

  return overrideValue ?? assistantValue
}

function resolveEffectiveNumber(
  assistantValue: number,
  mode: InheritMode,
  overrideValue: number | null
): number {
  if (mode !== 'override') {
    return assistantValue
  }

  return overrideValue ?? assistantValue
}

function resolveEffectiveCostMode(
  assistantValue: NormalChatCostMode,
  mode: InheritMode,
  overrideValue: NormalChatCostMode | null
): NormalChatCostMode {
  if (mode !== 'override') {
    return assistantValue
  }

  return overrideValue ?? assistantValue
}

function resolveModelSelection(
  providers: ModelProvider[],
  providerId: string | null,
  modelId: string | null
): ResolvedTopicModelSelection | null {
  if (!providerId || !modelId) {
    return null
  }

  const provider = providers.find((item) => item.id === providerId)
  if (!provider) {
    return null
  }

  const model = provider.models.find((item) => item.id === modelId)
  if (!model) {
    return null
  }

  return {
    provider,
    model
  }
}

function resolveEffectiveModelSelection(
  providers: ModelProvider[],
  assistant: NormalChatAssistant | null,
  topic: NormalChatTopic | null
): ResolvedTopicModelSelection | null {
  if (!assistant) {
    return null
  }

  if (topic?.modelMode === 'override') {
    return (
      resolveModelSelection(providers, topic.modelProviderIdOverride, topic.modelIdOverride) ??
      resolveModelSelection(providers, assistant.defaultModelProviderId, assistant.defaultModelId)
    )
  }

  return resolveModelSelection(
    providers,
    assistant.defaultModelProviderId,
    assistant.defaultModelId
  )
}

function buildModelLabel(selection: ResolvedTopicModelSelection | null): string {
  if (!selection) {
    return '未选择模型'
  }

  return `${selection.model.name || selection.model.id} · ${selection.provider.name}`
}

function pickFallbackModel(providers: ModelProvider[]): ResolvedTopicModelSelection | null {
  const provider = providers.find((item) => item.models.length > 0)
  const model = provider?.models[0] ?? null
  if (!provider || !model) {
    return null
  }

  return {
    provider,
    model
  }
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

export const useNormalChatWorkspaceStore = defineStore('normal-chat-workspace', () => {
  const modelConfigStore = useModelConfigStore()
  const initialized = ref(false)
  const snapshot = ref<NormalChatWorkspaceSnapshot>(createEmptyWorkspaceSnapshot())

  const createAssistantDialogOpen = ref(false)
  const assistantSettingsOpen = ref(false)
  const headerModelSelectorOpen = ref(false)
  const settingsScope = ref<SettingsScope>('assistant')
  const activeSettingsTab = ref<AssistantSettingsTab>('basic')
  const actionExpandedMap = ref<Record<AssistantActionItemId, boolean>>({
    ...DEFAULT_ACTION_EXPANDED_MAP
  })

  const assistantNameDraft = ref('')
  const assistantDefaultPromptDraft = ref('')
  const assistantStreamingEnabledDraft = ref(true)
  const assistantCostModeDraft = ref<NormalChatCostMode>('per_token')
  const assistantDefaultModelProviderIdDraft = ref<string | null>(null)
  const assistantDefaultModelIdDraft = ref<string | null>(null)
  const assistantContextMemoryRoundsDraft = ref(12)
  const assistantMaxRecursionDepthDraft = ref(2)
  const assistantMaxReasoningStepsDraft = ref(6)
  const assistantSystemActionFunctionCallEnabledDraft = ref(true)
  const assistantSystemActionSubAgentEnabledDraft = ref(true)
  const assistantFunctionCallPubMedEnabledDraft = ref(true)
  const assistantFunctionCallPubMedModeDraft = ref<NormalChatFunctionCallMode>('fast')
  const assistantMcpEnabledDraft = ref(false)
  const assistantPersistencePresetDraft = ref<NormalChatPersistencePreset>('light')

  const topicPromptModeDraft = ref<InheritMode>('inherit')
  const topicPromptDraft = ref('')
  const topicStreamingModeDraft = ref<InheritMode>('inherit')
  const topicStreamingEnabledOverrideDraft = ref<boolean | null>(null)
  const topicCostModeDraft = ref<InheritMode>('inherit')
  const topicCostModeOverrideDraft = ref<NormalChatCostMode | null>(null)
  const topicModelModeDraft = ref<InheritMode>('inherit')
  const topicModelProviderIdOverrideDraft = ref<string | null>(null)
  const topicModelIdOverrideDraft = ref<string | null>(null)
  const topicContextMemoryRoundsModeDraft = ref<InheritMode>('inherit')
  const topicContextMemoryRoundsOverrideDraft = ref<number | null>(null)
  const topicMaxRecursionDepthModeDraft = ref<InheritMode>('inherit')
  const topicMaxRecursionDepthOverrideDraft = ref<number | null>(null)
  const topicMaxReasoningStepsModeDraft = ref<InheritMode>('inherit')
  const topicMaxReasoningStepsOverrideDraft = ref<number | null>(null)
  const topicSystemActionFunctionCallModeDraft = ref<InheritMode>('inherit')
  const topicSystemActionFunctionCallEnabledOverrideDraft = ref<boolean | null>(null)
  const topicSystemActionSubAgentModeDraft = ref<InheritMode>('inherit')
  const topicSystemActionSubAgentEnabledOverrideDraft = ref<boolean | null>(null)
  const topicFunctionCallPubMedModeDraft = ref<InheritMode>('inherit')
  const topicFunctionCallPubMedEnabledOverrideDraft = ref<boolean | null>(null)
  const topicFunctionCallPubMedExecutionModeDraft = ref<InheritMode>('inherit')
  const topicFunctionCallPubMedExecutionModeOverrideDraft = ref<NormalChatFunctionCallMode | null>(
    null
  )
  const topicMcpModeDraft = ref<InheritMode>('inherit')
  const topicMcpEnabledOverrideDraft = ref<boolean | null>(null)

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

  const currentConversationLabel = computed(() => {
    return `${currentAssistant.value?.name ?? '未选择助手'}--${currentTopic.value?.title ?? '未选择话题'}`
  })

  const effectiveSystemPrompt = computed(() => {
    return resolveEffectiveSystemPrompt(currentAssistant.value, currentTopic.value)
  })

  const currentTopicUsesAssistantPrompt = computed(() => {
    return currentTopic.value?.systemPromptMode !== 'override'
  })

  const effectiveStreamingEnabled = computed(() => {
    if (!currentAssistant.value) {
      return true
    }

    return resolveEffectiveBoolean(
      currentAssistant.value.streamingEnabled,
      currentTopic.value?.streamingMode ?? 'inherit',
      currentTopic.value?.streamingEnabledOverride ?? null
    )
  })

  const effectiveCostMode = computed(() => {
    if (!currentAssistant.value) {
      return 'per_token'
    }

    return resolveEffectiveCostMode(
      currentAssistant.value.costMode,
      currentTopic.value?.costMode ?? 'inherit',
      currentTopic.value?.costModeOverride ?? null
    )
  })

  const effectiveContextMemoryRounds = computed(() => {
    if (!currentAssistant.value) {
      return 12
    }

    return resolveEffectiveNumber(
      currentAssistant.value.contextMemoryRounds,
      currentTopic.value?.contextMemoryRoundsMode ?? 'inherit',
      currentTopic.value?.contextMemoryRoundsOverride ?? null
    )
  })

  const effectiveMaxRecursionDepth = computed(() => {
    if (!currentAssistant.value) {
      return 2
    }

    return resolveEffectiveNumber(
      currentAssistant.value.maxRecursionDepth,
      currentTopic.value?.maxRecursionDepthMode ?? 'inherit',
      currentTopic.value?.maxRecursionDepthOverride ?? null
    )
  })

  const effectiveMaxReasoningSteps = computed(() => {
    if (!currentAssistant.value) {
      return 6
    }

    return resolveEffectiveNumber(
      currentAssistant.value.maxReasoningSteps,
      currentTopic.value?.maxReasoningStepsMode ?? 'inherit',
      currentTopic.value?.maxReasoningStepsOverride ?? null
    )
  })

  const effectiveSystemActionFunctionCallEnabled = computed(() => {
    if (!currentAssistant.value) {
      return true
    }

    return resolveEffectiveBoolean(
      currentAssistant.value.systemActionFunctionCallEnabled,
      currentTopic.value?.systemActionFunctionCallMode ?? 'inherit',
      currentTopic.value?.systemActionFunctionCallEnabledOverride ?? null
    )
  })

  const effectiveSystemActionSubAgentEnabled = computed(() => {
    if (!currentAssistant.value) {
      return true
    }

    return resolveEffectiveBoolean(
      currentAssistant.value.systemActionSubAgentEnabled,
      currentTopic.value?.systemActionSubAgentMode ?? 'inherit',
      currentTopic.value?.systemActionSubAgentEnabledOverride ?? null
    )
  })

  const effectiveFunctionCallPubMedEnabled = computed(() => {
    if (!currentAssistant.value) {
      return true
    }

    return resolveEffectiveBoolean(
      currentAssistant.value.functionCallPubMedEnabled,
      currentTopic.value?.functionCallPubMedMode ?? 'inherit',
      currentTopic.value?.functionCallPubMedEnabledOverride ?? null
    )
  })

  const effectiveFunctionCallPubMedMode = computed<NormalChatFunctionCallMode>(() => {
    if (!currentAssistant.value) {
      return 'fast'
    }

    if (currentTopic.value?.functionCallPubMedExecutionMode !== 'override') {
      return currentAssistant.value.functionCallPubMedMode
    }

    return (
      currentTopic.value.functionCallPubMedExecutionModeOverride ??
      currentAssistant.value.functionCallPubMedMode
    )
  })

  const effectiveMcpEnabled = computed(() => {
    if (!currentAssistant.value) {
      return false
    }

    return resolveEffectiveBoolean(
      currentAssistant.value.mcpEnabled,
      currentTopic.value?.mcpMode ?? 'inherit',
      currentTopic.value?.mcpEnabledOverride ?? null
    )
  })

  const currentTopicModelSelection = computed<ResolvedTopicModelSelection | null>(() => {
    return resolveEffectiveModelSelection(
      modelConfigStore.providers,
      currentAssistant.value,
      currentTopic.value
    )
  })

  // 兼容现有 NormalChat 发送链与 composer：继续暴露 provider/model id 形式的全局派生状态。
  const currentTopicModelProviderId = computed(() => {
    return currentTopicModelSelection.value?.provider.id ?? ''
  })

  const currentTopicModelId = computed(() => {
    return currentTopicModelSelection.value?.model.id ?? ''
  })

  const currentTopicModelLabel = computed(() => {
    return buildModelLabel(currentTopicModelSelection.value)
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
    if (settingsScope.value === 'topic') {
      return '话题配置'
    }

    return (
      SETTINGS_NAV_ITEMS.find((item) => item.id === activeSettingsTab.value)?.label ?? '基础设置'
    )
  })

  const promptEditorIsInherited = computed(() => {
    return settingsScope.value === 'topic' && topicPromptModeDraft.value === 'inherit'
  })

  function ensureAssistantDefaultModelDraft(): void {
    const resolved = resolveModelSelection(
      modelConfigStore.providers,
      assistantDefaultModelProviderIdDraft.value,
      assistantDefaultModelIdDraft.value
    )
    if (resolved) {
      return
    }

    const fallback = pickFallbackModel(modelConfigStore.providers)
    if (!fallback) {
      return
    }

    assistantDefaultModelProviderIdDraft.value = fallback.provider.id
    assistantDefaultModelIdDraft.value = fallback.model.id
  }

  function ensureTopicOverrideModelDraft(): void {
    if (topicModelModeDraft.value !== 'override') {
      return
    }

    const resolved = resolveModelSelection(
      modelConfigStore.providers,
      topicModelProviderIdOverrideDraft.value,
      topicModelIdOverrideDraft.value
    )
    if (resolved) {
      return
    }

    topicModelProviderIdOverrideDraft.value = assistantDefaultModelProviderIdDraft.value
    topicModelIdOverrideDraft.value = assistantDefaultModelIdDraft.value
  }

  function clampNonNegative(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
      return fallback
    }

    return Math.max(0, Math.round(value))
  }

  function syncDraftsFromSelection(): void {
    assistantNameDraft.value = currentAssistant.value?.name ?? ''
    assistantDefaultPromptDraft.value = currentAssistant.value?.defaultSystemPrompt ?? ''
    assistantStreamingEnabledDraft.value = currentAssistant.value?.streamingEnabled ?? true
    assistantCostModeDraft.value = currentAssistant.value?.costMode ?? 'per_token'
    assistantDefaultModelProviderIdDraft.value =
      currentAssistant.value?.defaultModelProviderId ?? null
    assistantDefaultModelIdDraft.value = currentAssistant.value?.defaultModelId ?? null
    assistantContextMemoryRoundsDraft.value = currentAssistant.value?.contextMemoryRounds ?? 12
    assistantMaxRecursionDepthDraft.value = currentAssistant.value?.maxRecursionDepth ?? 2
    assistantMaxReasoningStepsDraft.value = currentAssistant.value?.maxReasoningSteps ?? 6
    assistantSystemActionFunctionCallEnabledDraft.value = true
    assistantSystemActionSubAgentEnabledDraft.value = true
    assistantFunctionCallPubMedEnabledDraft.value =
      currentAssistant.value?.functionCallPubMedEnabled ?? true
    assistantFunctionCallPubMedModeDraft.value =
      currentAssistant.value?.functionCallPubMedMode ?? 'fast'
    assistantMcpEnabledDraft.value = currentAssistant.value?.mcpEnabled ?? false
    assistantPersistencePresetDraft.value = currentAssistant.value?.persistencePreset ?? 'light'

    topicPromptModeDraft.value = currentTopic.value?.systemPromptMode ?? 'inherit'
    topicPromptDraft.value =
      currentTopic.value?.systemPromptMode === 'override'
        ? (currentTopic.value.systemPromptOverride ?? '')
        : (currentAssistant.value?.defaultSystemPrompt ?? '')
    topicStreamingModeDraft.value = currentTopic.value?.streamingMode ?? 'inherit'
    topicStreamingEnabledOverrideDraft.value = currentTopic.value?.streamingEnabledOverride ?? null
    topicCostModeDraft.value = currentTopic.value?.costMode ?? 'inherit'
    topicCostModeOverrideDraft.value = currentTopic.value?.costModeOverride ?? null
    topicModelModeDraft.value = currentTopic.value?.modelMode ?? 'inherit'
    topicModelProviderIdOverrideDraft.value = currentTopic.value?.modelProviderIdOverride ?? null
    topicModelIdOverrideDraft.value = currentTopic.value?.modelIdOverride ?? null
    topicContextMemoryRoundsModeDraft.value =
      currentTopic.value?.contextMemoryRoundsMode ?? 'inherit'
    topicContextMemoryRoundsOverrideDraft.value =
      currentTopic.value?.contextMemoryRoundsOverride ?? null
    topicMaxRecursionDepthModeDraft.value = currentTopic.value?.maxRecursionDepthMode ?? 'inherit'
    topicMaxRecursionDepthOverrideDraft.value =
      currentTopic.value?.maxRecursionDepthOverride ?? null
    topicMaxReasoningStepsModeDraft.value = currentTopic.value?.maxReasoningStepsMode ?? 'inherit'
    topicMaxReasoningStepsOverrideDraft.value =
      currentTopic.value?.maxReasoningStepsOverride ?? null
    topicSystemActionFunctionCallModeDraft.value =
      currentTopic.value?.systemActionFunctionCallMode ?? 'inherit'
    topicSystemActionFunctionCallEnabledOverrideDraft.value =
      currentTopic.value?.systemActionFunctionCallEnabledOverride ?? null
    topicSystemActionSubAgentModeDraft.value =
      currentTopic.value?.systemActionSubAgentMode ?? 'inherit'
    topicSystemActionSubAgentEnabledOverrideDraft.value =
      currentTopic.value?.systemActionSubAgentEnabledOverride ?? null
    topicFunctionCallPubMedModeDraft.value = currentTopic.value?.functionCallPubMedMode ?? 'inherit'
    topicFunctionCallPubMedEnabledOverrideDraft.value =
      currentTopic.value?.functionCallPubMedEnabledOverride ?? null
    topicFunctionCallPubMedExecutionModeDraft.value =
      currentTopic.value?.functionCallPubMedExecutionMode ?? 'inherit'
    topicFunctionCallPubMedExecutionModeOverrideDraft.value =
      currentTopic.value?.functionCallPubMedExecutionModeOverride ?? null
    topicMcpModeDraft.value = currentTopic.value?.mcpMode ?? 'inherit'
    topicMcpEnabledOverrideDraft.value = currentTopic.value?.mcpEnabledOverride ?? null

    ensureAssistantDefaultModelDraft()
    ensureTopicOverrideModelDraft()
  }

  function applyWorkspaceSnapshot(nextSnapshot: NormalChatWorkspaceSnapshot): void {
    snapshot.value = nextSnapshot
    syncDraftsFromSelection()
  }

  async function initialize() {
    const bootstrap = await datasource.getBootstrap()
    snapshot.value = bootstrap.workspace

    try {
      await modelConfigStore.fetchProviders()
    } catch {
      // 模型配置暂时不可用时，不阻塞 normal chat 面板渲染。
    }

    initialized.value = true
    syncDraftsFromSelection()
  }

  function openCreateAssistantDialog(): void {
    createAssistantDialogOpen.value = true
  }

  function closeCreateAssistantDialog(): void {
    createAssistantDialogOpen.value = false
  }

  async function confirmCreateAssistant() {
    const nextSnapshot = await datasource.createAssistant()
    applyWorkspaceSnapshot(nextSnapshot)
    createAssistantDialogOpen.value = false
  }

  function openAssistantSettings(
    scope: SettingsScope = 'assistant',
    tab: AssistantSettingsTab = 'basic'
  ): void {
    settingsScope.value = scope
    activeSettingsTab.value = tab
    actionExpandedMap.value = { ...DEFAULT_ACTION_EXPANDED_MAP }
    assistantSettingsOpen.value = true
    syncDraftsFromSelection()
  }

  async function openAssistantSettingsForAssistant(assistantId: string) {
    if (assistantId && assistantId !== snapshot.value.activeAssistantId) {
      const nextSnapshot = await datasource.setActiveAssistant({ assistantId })
      applyWorkspaceSnapshot(nextSnapshot)
    }

    openAssistantSettings('assistant', 'basic')
  }

  function openTopicSettings(tab: AssistantSettingsTab = 'basic'): void {
    openAssistantSettings('topic', tab)
  }

  function closeAssistantSettings(): void {
    assistantSettingsOpen.value = false
  }

  function openHeaderModelSelector(): void {
    headerModelSelectorOpen.value = true
  }

  function closeHeaderModelSelector(): void {
    headerModelSelectorOpen.value = false
  }

  function setActiveSettingsTab(tab: AssistantSettingsTab): void {
    activeSettingsTab.value = tab
  }

  function toggleActionExpanded(itemId: AssistantActionItemId): void {
    actionExpandedMap.value[itemId] = !actionExpandedMap.value[itemId]
  }

  function setAssistantNameDraft(value: string): void {
    assistantNameDraft.value = value
  }

  function setAssistantDefaultPromptDraft(value: string): void {
    assistantDefaultPromptDraft.value = value
  }

  function setAssistantStreamingEnabledDraft(value: boolean): void {
    assistantStreamingEnabledDraft.value = value
  }

  function setAssistantCostModeDraft(value: NormalChatCostMode): void {
    assistantCostModeDraft.value = value
  }

  function setAssistantDefaultModelProviderIdDraft(value: string | null): void {
    assistantDefaultModelProviderIdDraft.value = value
    const provider = modelConfigStore.providers.find((item) => item.id === value) ?? null
    assistantDefaultModelIdDraft.value = provider?.models[0]?.id ?? null
  }

  function setAssistantDefaultModelIdDraft(value: string | null): void {
    assistantDefaultModelIdDraft.value = value
  }

  function setAssistantContextMemoryRoundsDraft(value: number): void {
    assistantContextMemoryRoundsDraft.value = clampNonNegative(value, 12)
  }

  function setAssistantMaxRecursionDepthDraft(value: number): void {
    assistantMaxRecursionDepthDraft.value = clampNonNegative(value, 2)
  }

  function setAssistantMaxReasoningStepsDraft(value: number): void {
    assistantMaxReasoningStepsDraft.value = clampNonNegative(value, 6)
  }

  function setAssistantSystemActionFunctionCallEnabledDraft(value: boolean): void {
    assistantSystemActionFunctionCallEnabledDraft.value = value
  }

  function setAssistantSystemActionSubAgentEnabledDraft(value: boolean): void {
    assistantSystemActionSubAgentEnabledDraft.value = value
  }

  function setAssistantFunctionCallPubMedEnabledDraft(value: boolean): void {
    assistantFunctionCallPubMedEnabledDraft.value = value
  }

  function setAssistantFunctionCallPubMedModeDraft(value: NormalChatFunctionCallMode): void {
    assistantFunctionCallPubMedModeDraft.value = value
  }

  function setAssistantMcpEnabledDraft(value: boolean): void {
    assistantMcpEnabledDraft.value = value
  }

  function setAssistantPersistencePresetDraft(value: NormalChatPersistencePreset): void {
    assistantPersistencePresetDraft.value = value
  }

  function setTopicSystemActionFunctionCallEnabledOverrideDraft(value: boolean): void {
    topicSystemActionFunctionCallModeDraft.value =
      value === assistantSystemActionFunctionCallEnabledDraft.value ? 'inherit' : 'override'
    topicSystemActionFunctionCallEnabledOverrideDraft.value =
      topicSystemActionFunctionCallModeDraft.value === 'override' ? value : null
  }

  function setTopicSystemActionSubAgentEnabledOverrideDraft(value: boolean): void {
    topicSystemActionSubAgentModeDraft.value =
      value === assistantSystemActionSubAgentEnabledDraft.value ? 'inherit' : 'override'
    topicSystemActionSubAgentEnabledOverrideDraft.value =
      topicSystemActionSubAgentModeDraft.value === 'override' ? value : null
  }

  function setTopicFunctionCallPubMedEnabledOverrideDraft(value: boolean): void {
    topicFunctionCallPubMedModeDraft.value =
      value === assistantFunctionCallPubMedEnabledDraft.value ? 'inherit' : 'override'
    topicFunctionCallPubMedEnabledOverrideDraft.value =
      topicFunctionCallPubMedModeDraft.value === 'override' ? value : null
  }

  function setTopicFunctionCallPubMedExecutionModeOverrideDraft(
    value: NormalChatFunctionCallMode
  ): void {
    topicFunctionCallPubMedExecutionModeDraft.value =
      value === assistantFunctionCallPubMedModeDraft.value ? 'inherit' : 'override'
    topicFunctionCallPubMedExecutionModeOverrideDraft.value =
      topicFunctionCallPubMedExecutionModeDraft.value === 'override' ? value : null
  }

  function setTopicMcpEnabledOverrideDraft(value: boolean): void {
    topicMcpModeDraft.value = value === assistantMcpEnabledDraft.value ? 'inherit' : 'override'
    topicMcpEnabledOverrideDraft.value = topicMcpModeDraft.value === 'override' ? value : null
  }

  function setTopicPromptModeDraft(value: InheritMode): void {
    topicPromptModeDraft.value = value
    if (value === 'inherit') {
      topicPromptDraft.value = assistantDefaultPromptDraft.value
      return
    }

    if (!topicPromptDraft.value.trim()) {
      topicPromptDraft.value = assistantDefaultPromptDraft.value
    }
  }

  function setTopicPromptDraft(value: string): void {
    topicPromptModeDraft.value =
      value.trim() === assistantDefaultPromptDraft.value.trim() ? 'inherit' : 'override'
    topicPromptDraft.value = value
  }

  function setTopicStreamingModeDraft(value: InheritMode): void {
    topicStreamingModeDraft.value = value
    if (value === 'inherit') {
      topicStreamingEnabledOverrideDraft.value = null
    } else if (topicStreamingEnabledOverrideDraft.value === null) {
      topicStreamingEnabledOverrideDraft.value = assistantStreamingEnabledDraft.value
    }
  }

  function setTopicStreamingEnabledOverrideDraft(value: boolean): void {
    topicStreamingModeDraft.value =
      value === assistantStreamingEnabledDraft.value ? 'inherit' : 'override'
    topicStreamingEnabledOverrideDraft.value =
      topicStreamingModeDraft.value === 'override' ? value : null
  }

  function setTopicCostModeDraft(value: InheritMode): void {
    topicCostModeDraft.value = value
    if (value === 'inherit') {
      topicCostModeOverrideDraft.value = null
    } else if (!topicCostModeOverrideDraft.value) {
      topicCostModeOverrideDraft.value = assistantCostModeDraft.value
    }
  }

  function setTopicCostModeOverrideDraft(value: NormalChatCostMode): void {
    topicCostModeDraft.value = value === assistantCostModeDraft.value ? 'inherit' : 'override'
    topicCostModeOverrideDraft.value = topicCostModeDraft.value === 'override' ? value : null
  }

  function setTopicModelModeDraft(value: InheritMode): void {
    topicModelModeDraft.value = value
    if (value === 'inherit') {
      topicModelProviderIdOverrideDraft.value = null
      topicModelIdOverrideDraft.value = null
      return
    }

    ensureTopicOverrideModelDraft()
  }

  function setTopicModelProviderIdOverrideDraft(value: string | null): void {
    const provider = modelConfigStore.providers.find((item) => item.id === value) ?? null
    const nextModelId = provider?.models[0]?.id ?? null
    const matchesAssistant =
      value === assistantDefaultModelProviderIdDraft.value &&
      nextModelId === assistantDefaultModelIdDraft.value

    topicModelModeDraft.value = matchesAssistant ? 'inherit' : 'override'
    topicModelProviderIdOverrideDraft.value = matchesAssistant ? null : value
    topicModelIdOverrideDraft.value = matchesAssistant ? null : nextModelId
  }

  function setTopicModelIdOverrideDraft(value: string | null): void {
    const matchesAssistant =
      topicModelProviderIdOverrideDraft.value === assistantDefaultModelProviderIdDraft.value &&
      value === assistantDefaultModelIdDraft.value

    topicModelModeDraft.value = matchesAssistant ? 'inherit' : 'override'
    topicModelIdOverrideDraft.value = matchesAssistant ? null : value
  }

  function setTopicContextMemoryRoundsModeDraft(value: InheritMode): void {
    topicContextMemoryRoundsModeDraft.value = value
    if (value === 'inherit') {
      topicContextMemoryRoundsOverrideDraft.value = null
    } else if (topicContextMemoryRoundsOverrideDraft.value === null) {
      topicContextMemoryRoundsOverrideDraft.value = assistantContextMemoryRoundsDraft.value
    }
  }

  function setTopicContextMemoryRoundsOverrideDraft(value: number): void {
    const nextValue = clampNonNegative(value, 12)
    topicContextMemoryRoundsModeDraft.value =
      nextValue === assistantContextMemoryRoundsDraft.value ? 'inherit' : 'override'
    topicContextMemoryRoundsOverrideDraft.value =
      topicContextMemoryRoundsModeDraft.value === 'override' ? nextValue : null
  }

  function setTopicMaxRecursionDepthModeDraft(value: InheritMode): void {
    topicMaxRecursionDepthModeDraft.value = value
    if (value === 'inherit') {
      topicMaxRecursionDepthOverrideDraft.value = null
    } else if (topicMaxRecursionDepthOverrideDraft.value === null) {
      topicMaxRecursionDepthOverrideDraft.value = assistantMaxRecursionDepthDraft.value
    }
  }

  function setTopicMaxRecursionDepthOverrideDraft(value: number): void {
    const nextValue = clampNonNegative(value, 2)
    topicMaxRecursionDepthModeDraft.value =
      nextValue === assistantMaxRecursionDepthDraft.value ? 'inherit' : 'override'
    topicMaxRecursionDepthOverrideDraft.value =
      topicMaxRecursionDepthModeDraft.value === 'override' ? nextValue : null
  }

  function setTopicMaxReasoningStepsModeDraft(value: InheritMode): void {
    topicMaxReasoningStepsModeDraft.value = value
    if (value === 'inherit') {
      topicMaxReasoningStepsOverrideDraft.value = null
    } else if (topicMaxReasoningStepsOverrideDraft.value === null) {
      topicMaxReasoningStepsOverrideDraft.value = assistantMaxReasoningStepsDraft.value
    }
  }

  function setTopicMaxReasoningStepsOverrideDraft(value: number): void {
    const nextValue = clampNonNegative(value, 6)
    topicMaxReasoningStepsModeDraft.value =
      nextValue === assistantMaxReasoningStepsDraft.value ? 'inherit' : 'override'
    topicMaxReasoningStepsOverrideDraft.value =
      topicMaxReasoningStepsModeDraft.value === 'override' ? nextValue : null
  }

  async function quickSelectCurrentTopicModel(
    providerId: string | null,
    modelId: string | null
  ): Promise<void> {
    if (!currentAssistant.value || !currentTopic.value) {
      return
    }

    const matchesAssistant =
      providerId === assistantDefaultModelProviderIdDraft.value &&
      modelId === assistantDefaultModelIdDraft.value

    const nextSnapshot = await datasource.updateTopicConfig({
      assistantId: currentAssistant.value.id,
      topicId: currentTopic.value.id,
      modelMode: matchesAssistant ? 'inherit' : 'override',
      modelProviderIdOverride: matchesAssistant ? null : providerId,
      modelIdOverride: matchesAssistant ? null : modelId
    })

    applyWorkspaceSnapshot(nextSnapshot)
  }

  async function saveSettings() {
    if (!currentAssistant.value) {
      return
    }

    if (settingsScope.value === 'assistant') {
      const nextSnapshot = await datasource.updateAssistant({
        assistantId: currentAssistant.value.id,
        name: assistantNameDraft.value.trim() || currentAssistant.value.name,
        defaultSystemPrompt: assistantDefaultPromptDraft.value,
        streamingEnabled: assistantStreamingEnabledDraft.value,
        costMode: assistantCostModeDraft.value,
        defaultModelProviderId: assistantDefaultModelProviderIdDraft.value,
        defaultModelId: assistantDefaultModelIdDraft.value,
        contextMemoryRounds: assistantContextMemoryRoundsDraft.value,
        maxRecursionDepth: assistantMaxRecursionDepthDraft.value,
        maxReasoningSteps: assistantMaxReasoningStepsDraft.value,
        systemActionFunctionCallEnabled: assistantSystemActionFunctionCallEnabledDraft.value,
        systemActionSubAgentEnabled: assistantSystemActionSubAgentEnabledDraft.value,
        functionCallPubMedEnabled: assistantFunctionCallPubMedEnabledDraft.value,
        functionCallPubMedMode: assistantFunctionCallPubMedModeDraft.value,
        mcpEnabled: assistantMcpEnabledDraft.value,
        persistencePreset: assistantPersistencePresetDraft.value
      })
      applyWorkspaceSnapshot(nextSnapshot)
      assistantSettingsOpen.value = false
      return
    }

    if (!currentTopic.value) {
      return
    }

    const nextSnapshot = await datasource.updateTopicConfig({
      assistantId: currentAssistant.value.id,
      topicId: currentTopic.value.id,
      systemPromptMode: topicPromptModeDraft.value,
      systemPromptOverride:
        topicPromptModeDraft.value === 'override' ? topicPromptDraft.value : null,
      streamingMode: topicStreamingModeDraft.value,
      streamingEnabledOverride:
        topicStreamingModeDraft.value === 'override'
          ? topicStreamingEnabledOverrideDraft.value
          : null,
      costMode: topicCostModeDraft.value,
      costModeOverride:
        topicCostModeDraft.value === 'override' ? topicCostModeOverrideDraft.value : null,
      modelMode: topicModelModeDraft.value,
      modelProviderIdOverride:
        topicModelModeDraft.value === 'override' ? topicModelProviderIdOverrideDraft.value : null,
      modelIdOverride:
        topicModelModeDraft.value === 'override' ? topicModelIdOverrideDraft.value : null,
      contextMemoryRoundsMode: topicContextMemoryRoundsModeDraft.value,
      contextMemoryRoundsOverride:
        topicContextMemoryRoundsModeDraft.value === 'override'
          ? topicContextMemoryRoundsOverrideDraft.value
          : null,
      maxRecursionDepthMode: topicMaxRecursionDepthModeDraft.value,
      maxRecursionDepthOverride:
        topicMaxRecursionDepthModeDraft.value === 'override'
          ? topicMaxRecursionDepthOverrideDraft.value
          : null,
      maxReasoningStepsMode: topicMaxReasoningStepsModeDraft.value,
      maxReasoningStepsOverride:
        topicMaxReasoningStepsModeDraft.value === 'override'
          ? topicMaxReasoningStepsOverrideDraft.value
          : null,
      systemActionFunctionCallMode: topicSystemActionFunctionCallModeDraft.value,
      systemActionFunctionCallEnabledOverride:
        topicSystemActionFunctionCallModeDraft.value === 'override'
          ? topicSystemActionFunctionCallEnabledOverrideDraft.value
          : null,
      systemActionSubAgentMode: topicSystemActionSubAgentModeDraft.value,
      systemActionSubAgentEnabledOverride:
        topicSystemActionSubAgentModeDraft.value === 'override'
          ? topicSystemActionSubAgentEnabledOverrideDraft.value
          : null,
      functionCallPubMedMode: topicFunctionCallPubMedModeDraft.value,
      functionCallPubMedEnabledOverride:
        topicFunctionCallPubMedModeDraft.value === 'override'
          ? topicFunctionCallPubMedEnabledOverrideDraft.value
          : null,
      functionCallPubMedExecutionMode: topicFunctionCallPubMedExecutionModeDraft.value,
      functionCallPubMedExecutionModeOverride:
        topicFunctionCallPubMedExecutionModeDraft.value === 'override'
          ? topicFunctionCallPubMedExecutionModeOverrideDraft.value
          : null,
      mcpMode: topicMcpModeDraft.value,
      mcpEnabledOverride:
        topicMcpModeDraft.value === 'override' ? topicMcpEnabledOverrideDraft.value : null
    })

    applyWorkspaceSnapshot(nextSnapshot)
    assistantSettingsOpen.value = false
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

  return {
    initialized,
    snapshot,
    createAssistantDialogOpen,
    assistantSettingsOpen,
    headerModelSelectorOpen,
    settingsScope,
    activeSettingsTab,
    actionExpandedMap,
    settingsNavItems: SETTINGS_NAV_ITEMS,
    assistantNameDraft,
    assistantDefaultPromptDraft,
    assistantStreamingEnabledDraft,
    assistantCostModeDraft,
    assistantDefaultModelProviderIdDraft,
    assistantDefaultModelIdDraft,
    assistantContextMemoryRoundsDraft,
    assistantMaxRecursionDepthDraft,
    assistantMaxReasoningStepsDraft,
    assistantSystemActionFunctionCallEnabledDraft,
    assistantSystemActionSubAgentEnabledDraft,
    assistantFunctionCallPubMedEnabledDraft,
    assistantFunctionCallPubMedModeDraft,
    assistantMcpEnabledDraft,
    assistantPersistencePresetDraft,
    topicPromptModeDraft,
    topicPromptDraft,
    topicStreamingModeDraft,
    topicStreamingEnabledOverrideDraft,
    topicCostModeDraft,
    topicCostModeOverrideDraft,
    topicModelModeDraft,
    topicModelProviderIdOverrideDraft,
    topicModelIdOverrideDraft,
    topicContextMemoryRoundsModeDraft,
    topicContextMemoryRoundsOverrideDraft,
    topicMaxRecursionDepthModeDraft,
    topicMaxRecursionDepthOverrideDraft,
    topicMaxReasoningStepsModeDraft,
    topicMaxReasoningStepsOverrideDraft,
    topicSystemActionFunctionCallModeDraft,
    topicSystemActionFunctionCallEnabledOverrideDraft,
    topicSystemActionSubAgentModeDraft,
    topicSystemActionSubAgentEnabledOverrideDraft,
    topicFunctionCallPubMedModeDraft,
    topicFunctionCallPubMedEnabledOverrideDraft,
    topicFunctionCallPubMedExecutionModeDraft,
    topicFunctionCallPubMedExecutionModeOverrideDraft,
    topicMcpModeDraft,
    topicMcpEnabledOverrideDraft,
    editingTopicId,
    topicRenameDraft,
    currentAssistant,
    currentTopics,
    currentTopic,
    currentConversationLabel,
    effectiveSystemPrompt,
    currentTopicUsesAssistantPrompt,
    effectiveStreamingEnabled,
    effectiveCostMode,
    effectiveContextMemoryRounds,
    effectiveMaxRecursionDepth,
    effectiveMaxReasoningSteps,
    effectiveSystemActionFunctionCallEnabled,
    effectiveSystemActionSubAgentEnabled,
    effectiveFunctionCallPubMedEnabled,
    effectiveFunctionCallPubMedMode,
    effectiveMcpEnabled,
    currentTopicModelSelection,
    currentTopicModelProviderId,
    currentTopicModelId,
    currentTopicModelLabel,
    assistantGroups,
    currentSettingsLabel,
    promptEditorIsInherited,
    initialize,
    openCreateAssistantDialog,
    closeCreateAssistantDialog,
    confirmCreateAssistant,
    openAssistantSettings,
    openAssistantSettingsForAssistant,
    openTopicSettings,
    closeAssistantSettings,
    openHeaderModelSelector,
    closeHeaderModelSelector,
    setActiveSettingsTab,
    toggleActionExpanded,
    setAssistantNameDraft,
    setAssistantDefaultPromptDraft,
    setAssistantStreamingEnabledDraft,
    setAssistantCostModeDraft,
    setAssistantDefaultModelProviderIdDraft,
    setAssistantDefaultModelIdDraft,
    setAssistantContextMemoryRoundsDraft,
    setAssistantMaxRecursionDepthDraft,
    setAssistantMaxReasoningStepsDraft,
    setAssistantSystemActionFunctionCallEnabledDraft,
    setAssistantSystemActionSubAgentEnabledDraft,
    setAssistantFunctionCallPubMedEnabledDraft,
    setAssistantFunctionCallPubMedModeDraft,
    setAssistantMcpEnabledDraft,
    setAssistantPersistencePresetDraft,
    setTopicSystemActionFunctionCallEnabledOverrideDraft,
    setTopicSystemActionSubAgentEnabledOverrideDraft,
    setTopicFunctionCallPubMedEnabledOverrideDraft,
    setTopicFunctionCallPubMedExecutionModeOverrideDraft,
    setTopicMcpEnabledOverrideDraft,
    setTopicPromptModeDraft,
    setTopicPromptDraft,
    setTopicStreamingModeDraft,
    setTopicStreamingEnabledOverrideDraft,
    setTopicCostModeDraft,
    setTopicCostModeOverrideDraft,
    setTopicModelModeDraft,
    setTopicModelProviderIdOverrideDraft,
    setTopicModelIdOverrideDraft,
    setTopicContextMemoryRoundsModeDraft,
    setTopicContextMemoryRoundsOverrideDraft,
    setTopicMaxRecursionDepthModeDraft,
    setTopicMaxRecursionDepthOverrideDraft,
    setTopicMaxReasoningStepsModeDraft,
    setTopicMaxReasoningStepsOverrideDraft,
    quickSelectCurrentTopicModel,
    saveSettings,
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
