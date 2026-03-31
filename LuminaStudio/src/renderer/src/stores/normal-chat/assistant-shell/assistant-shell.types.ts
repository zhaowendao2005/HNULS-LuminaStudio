/**
 * @deprecated Unused legacy shell types. This directory is not wired into the current normal-chat renderer flow.
 */
/**
 * NormalChat 助手壳层类型
 * 说明：覆盖顶部面包屑、系统提示条、设置弹窗这类 UI 状态。
 */
export type AssistantSettingsTab = 'model' | 'prompt' | 'kb' | 'mcp' | 'phrases' | 'memory'

export interface AssistantIdentity {
  id: string
  name: string
  emoji: string
}

export interface AssistantModelMeta {
  label: string
}

export interface AssistantSettingsNavItem {
  id: AssistantSettingsTab
  label: string
}

export interface AssistantShellSnapshot {
  assistant: AssistantIdentity
  modelMeta: AssistantModelMeta
  systemPromptPreview: string
  settingsOpened: boolean
  activeSettingsTab: AssistantSettingsTab
  editableAssistantName: string
  editablePromptText: string
  settingsNavItems: AssistantSettingsNavItem[]
}
