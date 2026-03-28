import type { NormalChatFunctionCallMessagePart } from '@preload/types'

export type FunctioncallDetailPage = 'overview' | 'call-detail'

export type FunctioncallDetailDataViewMode = 'json' | 'yaml'

export interface FunctioncallDetailShellOpenPayload {
  requestId: string
  messageId: string
  callId?: string
}

export interface FunctioncallDetailShellCallItem {
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
  part: NormalChatFunctionCallMessagePart
}

export interface FunctioncallDetailShellRecord {
  requestId: string
  messageId: string
  assistantName: string
  topicTitle: string
  description: string
  calls: FunctioncallDetailShellCallItem[]
}

export interface FunctioncallDetailShellSnapshot {
  visible: boolean
  requestId: string
  messageId: string
  currentPage: FunctioncallDetailPage
  selectedCallId: string
  requestViewMode: FunctioncallDetailDataViewMode
  responseViewMode: FunctioncallDetailDataViewMode
  loading: boolean
  errorText: string
  detailByRequestId: Record<string, FunctioncallDetailShellRecord>
}
