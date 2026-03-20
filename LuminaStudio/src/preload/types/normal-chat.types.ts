import type { ApiResponse } from './base.types'

export type NormalChatTopicPromptMode = 'inherit' | 'override'

export interface NormalChatLabel {
  id: string
  name: string
  sortOrder: number
}

export interface NormalChatAgentTemplate {
  key: string
  title: string
  description: string
  emoji: string
}

export interface NormalChatAssistant {
  id: string
  templateKey: string
  name: string
  emoji: string
  labelId: string | null
  defaultSystemPrompt: string
  sortOrder: number
}

export interface NormalChatTopic {
  id: string
  assistantId: string
  title: string
  systemPromptMode: NormalChatTopicPromptMode
  systemPromptOverride: string | null
  sortOrder: number
}

export interface NormalChatWorkspaceSnapshot {
  labels: NormalChatLabel[]
  assistants: NormalChatAssistant[]
  topicsByAssistantId: Record<string, NormalChatTopic[]>
  activeAssistantId: string
  activeTopicId: string
}

export interface NormalChatBootstrap {
  templates: NormalChatAgentTemplate[]
  workspace: NormalChatWorkspaceSnapshot
}

export interface NormalChatCreateAssistantRequest {
  templateKey: string
}

export interface NormalChatUpdateAssistantRequest {
  assistantId: string
  name?: string
  defaultSystemPrompt?: string
}

export interface NormalChatAssignLabelRequest {
  assistantId: string
  labelId: string | null
}

export interface NormalChatCreateLabelRequest {
  name: string
}

export interface NormalChatRenameLabelRequest {
  labelId: string
  name: string
}

export interface NormalChatDeleteLabelRequest {
  labelId: string
}

export interface NormalChatSetActiveAssistantRequest {
  assistantId: string
}

export interface NormalChatCreateTopicRequest {
  assistantId: string
}

export interface NormalChatRenameTopicRequest {
  assistantId: string
  topicId: string
  title: string
}

export interface NormalChatDeleteTopicRequest {
  assistantId: string
  topicId: string
}

export interface NormalChatSetActiveTopicRequest {
  assistantId: string
  topicId: string
}

export interface NormalChatUpdateTopicPromptRequest {
  assistantId: string
  topicId: string
  mode: NormalChatTopicPromptMode
  promptOverride?: string | null
}

export interface NormalChatAPI {
  getBootstrap: () => Promise<ApiResponse<NormalChatBootstrap>>
  createAssistant: (
    request: NormalChatCreateAssistantRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  updateAssistant: (
    request: NormalChatUpdateAssistantRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  assignLabel: (
    request: NormalChatAssignLabelRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  createLabel: (
    request: NormalChatCreateLabelRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  renameLabel: (
    request: NormalChatRenameLabelRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  deleteLabel: (
    request: NormalChatDeleteLabelRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  setActiveAssistant: (
    request: NormalChatSetActiveAssistantRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  createTopic: (
    request: NormalChatCreateTopicRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  renameTopic: (
    request: NormalChatRenameTopicRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  deleteTopic: (
    request: NormalChatDeleteTopicRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  setActiveTopic: (
    request: NormalChatSetActiveTopicRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  updateTopicPrompt: (
    request: NormalChatUpdateTopicPromptRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
}
