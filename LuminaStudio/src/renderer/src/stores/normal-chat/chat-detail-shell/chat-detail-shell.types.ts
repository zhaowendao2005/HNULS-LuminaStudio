export type ChatDetailPage = 'overview' | 'llm-call'

export type ChatDetailDataViewMode = 'json' | 'yaml'

export interface ChatDetailShellOpenPayload {
  requestId: string
  messageId: string
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
  requestPayload: Record<string, unknown>
  responsePayload: Record<string, unknown>
}

export interface ChatDetailShellRecord {
  requestId: string
  messageId: string
  assistantName: string
  topicTitle: string
  description: string
  calls: ChatDetailShellCallItem[]
}

export interface ChatDetailShellSnapshot {
  visible: boolean
  requestId: string
  messageId: string
  currentPage: ChatDetailPage
  selectedCallId: string
  requestViewMode: ChatDetailDataViewMode
  responseViewMode: ChatDetailDataViewMode
  loading: boolean
  errorText: string
  detailByRequestId: Record<string, ChatDetailShellRecord>
}
