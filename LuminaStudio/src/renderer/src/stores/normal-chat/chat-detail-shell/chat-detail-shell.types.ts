import type { NormalChatFunctionCallMessagePart } from '@preload/types'

export type ChatDetailPage =
  | 'overview'
  | 'llm-call'
  | 'functioncall-overview'
  | 'functioncall-detail'

export type ChatDetailDataViewMode = 'json' | 'yaml'

export interface ChatDetailShellOpenPayload {
  requestId: string
  messageId: string
  page?: ChatDetailPage
  selectedCallId?: string
  selectedFunctioncallId?: string
}

export type ChatDetailShellDocGroupId = 'request' | 'response' | 'schema_debug'

export interface ChatDetailShellDocItem {
  id: string
  groupId: ChatDetailShellDocGroupId
  title: string
  summary: string
  description: string
  payload: unknown
  kind: 'json-object' | 'markdown' | 'text'
}

export interface ChatDetailShellDocGroup {
  id: ChatDetailShellDocGroupId
  title: string
  items: ChatDetailShellDocItem[]
}

export interface ChatDetailShellCallItem {
  id: string
  indexLabel: string
  title: string
  summary: string
  contextText: string
  badge: string
  statusLabel: string
  statusClass: string
  groups: ChatDetailShellDocGroup[]
}

export interface ChatDetailShellFunctioncallItem {
  id: string
  indexLabel: string
  title: string
  summary: string
  contextText: string
  badge: string
  statusLabel: string
  statusClass: string
  rawInputPayload: Record<string, unknown>
  normalizedInputPayload: Record<string, unknown>
  autofilledKeys: string[]
  requestPayload: Record<string, unknown>
  responsePayload: Record<string, unknown>
  part: NormalChatFunctionCallMessagePart
}

export interface ChatDetailShellRecord {
  requestId: string
  messageId: string
  assistantName: string
  topicTitle: string
  description: string
  hasLlmCallDetails: boolean
  llmCallEmptyMessage: string | null
  calls: ChatDetailShellCallItem[]
  functioncalls: ChatDetailShellFunctioncallItem[]
}

export interface ChatDetailShellSnapshot {
  visible: boolean
  requestId: string
  messageId: string
  currentPage: ChatDetailPage
  selectedCallId: string
  selectedFunctioncallId: string
  selectedGroupId: ChatDetailShellDocGroupId
  selectedDocId: string
  requestViewMode: ChatDetailDataViewMode
  responseViewMode: ChatDetailDataViewMode
  schemaViewMode: ChatDetailDataViewMode
  loading: boolean
  errorText: string
  detailByRequestId: Record<string, ChatDetailShellRecord>
}
