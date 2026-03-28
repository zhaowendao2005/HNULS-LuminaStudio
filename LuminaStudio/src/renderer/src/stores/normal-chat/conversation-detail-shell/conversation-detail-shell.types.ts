export type ConversationDetailPage = 'overview' | 'llm-call'

export type ConversationDetailDataViewMode = 'json' | 'yaml'

export interface ConversationDetailShellOpenPayload {
  requestId: string
  messageId: string
  focusCallId?: string
}

export interface ConversationDetailShellCallItem {
  id: string
  indexLabel: string
  title: string
  summary: string
  contextText: string
  badge: string
  statusLabel: string
  statusClass: string
  requestPayload: Record<string, unknown>
  responsePayload: Record<string, unknown>
}

export interface ConversationDetailShellRecord {
  requestId: string
  messageId: string
  assistantName: string
  topicTitle: string
  description: string
  calls: ConversationDetailShellCallItem[]
}

export interface ConversationDetailShellSnapshot {
  visible: boolean
  requestId: string
  messageId: string
  focusCallId: string
  currentPage: ConversationDetailPage
  selectedCallId: string
  requestViewMode: ConversationDetailDataViewMode
  responseViewMode: ConversationDetailDataViewMode
  loading: boolean
  errorText: string
  detailByRequestId: Record<string, ConversationDetailShellRecord>
}
