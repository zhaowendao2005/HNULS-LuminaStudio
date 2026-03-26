import type {
  NormalChatCallMode,
  NormalChatCostMode,
  NormalChatTopicPromptMode
} from './common.types'

export interface NormalChatLabel {
  id: string
  name: string
  sortOrder: number
}

export interface NormalChatAssistant {
  id: string
  name: string
  emoji: string
  labelId: string | null
  defaultSystemPrompt: string
  saveFullConversationEnabled: boolean
  streamingEnabled: boolean
  callMode: NormalChatCallMode
  costMode: NormalChatCostMode
  maxRecursionDepth: number
  // 预留给下一版运行时系统：当前旧 agent 已清理，但该配置字段继续保留。
  maxRetriesPerAgent: number
  sortOrder: number
}

export interface NormalChatTopic {
  id: string
  assistantId: string
  title: string
  systemPromptMode: NormalChatTopicPromptMode
  systemPromptOverride: string | null
  streamingMode: 'inherit' | 'override'
  streamingEnabledOverride: boolean | null
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
  workspace: NormalChatWorkspaceSnapshot
}

export interface NormalChatCreateAssistantRequest {}

export interface NormalChatUpdateAssistantRequest {
  assistantId: string
  name?: string
  defaultSystemPrompt?: string
  saveFullConversationEnabled?: boolean
  streamingEnabled?: boolean
  callMode?: NormalChatCallMode
  costMode?: NormalChatCostMode
  maxRecursionDepth?: number
  // 预留给下一版运行时系统：当前旧 agent 已清理，但该配置字段继续保留。
  maxRetriesPerAgent?: number
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

export interface NormalChatUpdateTopicStreamingRequest {
  assistantId: string
  topicId: string
  mode: 'inherit' | 'override'
  streamingEnabledOverride?: boolean | null
}
