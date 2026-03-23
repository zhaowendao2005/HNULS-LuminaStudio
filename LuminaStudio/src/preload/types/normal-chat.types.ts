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
  saveFullConversationEnabled: boolean
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
  saveFullConversationEnabled?: boolean
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

export type NormalChatMessagePartKind = 'text'

export interface NormalChatMessagePart {
  kind: NormalChatMessagePartKind
  text: string
}

export type NormalChatConversationMessageRole = 'user' | 'assistant'

export interface NormalChatConversationMessage {
  id: string
  topicId: string
  requestId: string
  role: NormalChatConversationMessageRole
  parts: NormalChatMessagePart[]
  createdAt: string
  updatedAt: string
}

export interface NormalChatConversationSnapshot {
  topicId: string
  messages: NormalChatConversationMessage[]
}

export interface NormalChatGetConversationRequest {
  topicId: string
}

export interface NormalChatConversationPromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface NormalChatConversationTurnRequestPayload {
  assistant: {
    id: string
    name: string
    emoji: string
    templateKey: string
    defaultSystemPrompt: string
    saveFullConversationEnabled: boolean
  }
  topic: {
    id: string
    title: string
    systemPromptMode: NormalChatTopicPromptMode
    systemPromptOverride: string | null
  }
  providerId: string
  modelId: string
  input: string
  effectiveSystemPrompt: string
  promptMessages: NormalChatConversationPromptMessage[]
}

export interface NormalChatConversationTurnResponsePayload {
  chunks: string[]
  finalText: string
  aborted: boolean
  errorMessage: string | null
  completedAt: string | null
}

export interface NormalChatConversationTurnDetail {
  requestId: string
  topicId: string
  assistantId: string
  assistantName: string
  assistantEmoji: string
  topicTitle: string
  saveFullConversationEnabled: boolean
  hasTrace: boolean
  requestPayload: NormalChatConversationTurnRequestPayload | null
  responsePayload: NormalChatConversationTurnResponsePayload | null
  messages: NormalChatConversationMessage[]
}

export interface NormalChatGetConversationTurnDetailRequest {
  requestId: string
}

export interface NormalChatDeleteConversationTurnRequest {
  requestId: string
}

export interface NormalChatSendMessageRequest {
  topicId: string
  assistantId: string
  providerId: string
  modelId: string
  effectiveSystemPrompt: string
  input: string
  messageId: string
  requestId?: string
}

export interface NormalChatAbortRequest {
  requestId: string
}

export type NormalChatConversationStatusPhase = 'sending' | 'thinking' | 'streaming' | 'done'

interface NormalChatConversationBaseEvent {
  requestId: string
  topicId: string
}

export interface NormalChatConversationStatusEvent extends NormalChatConversationBaseEvent {
  type: 'status'
  phase: NormalChatConversationStatusPhase
  message: string
}

export interface NormalChatConversationAssistantChunkEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-chunk'
  delta: string
}

export interface NormalChatConversationMessageCommittedEvent extends NormalChatConversationBaseEvent {
  type: 'message-committed'
  message: NormalChatConversationMessage
}

export interface NormalChatConversationFinishEvent extends NormalChatConversationBaseEvent {
  type: 'finish'
  assistantMessageId: string | null
}

export interface NormalChatConversationErrorEvent extends NormalChatConversationBaseEvent {
  type: 'error'
  message: string
}

export type NormalChatConversationStreamEvent =
  | NormalChatConversationStatusEvent
  | NormalChatConversationAssistantChunkEvent
  | NormalChatConversationMessageCommittedEvent
  | NormalChatConversationFinishEvent
  | NormalChatConversationErrorEvent

export interface NormalChatAPI {
  getBootstrap: () => Promise<ApiResponse<NormalChatBootstrap>>
  getConversation: (
    request: NormalChatGetConversationRequest
  ) => Promise<ApiResponse<NormalChatConversationSnapshot>>
  sendMessage: (
    request: NormalChatSendMessageRequest
  ) => Promise<ApiResponse<{ requestId: string; messageId: string }>>
  getConversationTurnDetail: (
    request: NormalChatGetConversationTurnDetailRequest
  ) => Promise<ApiResponse<NormalChatConversationTurnDetail | null>>
  deleteConversationTurn: (
    request: NormalChatDeleteConversationTurnRequest
  ) => Promise<ApiResponse<void>>
  abort: (request: NormalChatAbortRequest) => Promise<ApiResponse<void>>
  onStream: (handler: (event: NormalChatConversationStreamEvent) => void) => () => void
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
