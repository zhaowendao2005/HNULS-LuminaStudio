import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AssistantShellDatasource } from './assistant-shell.datasource'
import type { AssistantSettingsTab, AssistantShellSnapshot } from './assistant-shell.types'

const datasource = new AssistantShellDatasource()

/**
 * NormalChat 助手壳层 Store（SSOT）
 * 说明：
 * - 中间区顶部、提示条、弹窗都从这里读取
 * - 组件不直接维护本地状态，保证行为可追踪
 */
export const useNormalChatAssistantShellStore = defineStore('normal-chat-assistant-shell', () => {
  const snapshot = ref<AssistantShellSnapshot>({
    assistant: { id: 'default-assistant', name: '默认助手', emoji: '🤪' },
    modelMeta: { label: 'Qwen/Qwen3-Coder-30B-Instruct | 硅基流动' },
    systemPromptPreview: '你好，我是默认助手。你可以立刻开始跟我聊天',
    settingsOpened: false,
    activeSettingsTab: 'prompt',
    editableAssistantName: '默认助手',
    editablePromptText: '',
    settingsNavItems: []
  })

  const currentSettingsLabel = computed(() => {
    return (
      snapshot.value.settingsNavItems.find((item) => item.id === snapshot.value.activeSettingsTab)
        ?.label ?? '提示词设置'
    )
  })

  async function initialize() {
    snapshot.value = await datasource.loadSnapshot()
  }

  async function persist() {
    await datasource.saveSnapshot(snapshot.value)
  }

  async function openSettings(tab: AssistantSettingsTab = 'prompt') {
    snapshot.value.activeSettingsTab = tab
    snapshot.value.settingsOpened = true
    await persist()
  }

  async function closeSettings() {
    snapshot.value.settingsOpened = false
    await persist()
  }

  async function setActiveSettingsTab(tab: AssistantSettingsTab) {
    snapshot.value.activeSettingsTab = tab
    await persist()
  }

  async function setEditableAssistantName(value: string) {
    snapshot.value.editableAssistantName = value
    await persist()
  }

  async function setEditablePromptText(value: string) {
    snapshot.value.editablePromptText = value
    await persist()
  }

  async function savePromptSettings() {
    snapshot.value.assistant.name = snapshot.value.editableAssistantName
    snapshot.value.systemPromptPreview =
      snapshot.value.editablePromptText.trim().length > 0
        ? snapshot.value.editablePromptText
        : '你好，我是默认助手。你可以立刻开始跟我聊天'
    snapshot.value.settingsOpened = false
    await persist()
  }

  return {
    snapshot,
    currentSettingsLabel,
    initialize,
    openSettings,
    closeSettings,
    setActiveSettingsTab,
    setEditableAssistantName,
    setEditablePromptText,
    savePromptSettings
  }
})
