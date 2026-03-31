/**
 * @deprecated Unused legacy shell types. This directory is not wired into the current normal-chat renderer flow.
 */
/**
 * 左侧栏（会话管理页）类型定义
 * 说明：
 * - 这组状态专门服务左侧栏，不和中间聊天区/右侧栏混用
 * - 通过明确类型约束，保证 UI 切换和列表渲染可追踪
 */
export type LeftSidebarTab = 'assistants' | 'topics'

export interface LeftSidebarAssistant {
  id: string
  name: string
  emoji: string
}

export interface LeftSidebarToolItem {
  id: string
  title: string
}

export interface LeftSidebarTopic {
  id: string
  title: string
}

export interface LeftSidebarSnapshot {
  activeTab: LeftSidebarTab
  activeAssistantId: string
  activeTopicId: string
  assistants: LeftSidebarAssistant[]
  drawSectionLabel: string
  toolsSectionLabel: string
  tools: LeftSidebarToolItem[]
  topics: LeftSidebarTopic[]
}
