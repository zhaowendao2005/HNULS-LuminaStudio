import type {
  NormalChatRuntimeAgentStatusSummary,
  NormalChatRuntimeAgentTree
} from '../runtime-trace/types'

export interface AgentDetailShellOpenPayload {
  requestId: string
  messageId: string
  focusAgentRunId?: string
}

export interface AgentDetailShellRecord {
  requestId: string
  messageId: string
  assistantName: string
  topicTitle: string
  description: string
  summary: NormalChatRuntimeAgentStatusSummary | null
  tree: NormalChatRuntimeAgentTree | null
  sourceLabel: string
}

export interface AgentDetailShellSnapshot {
  visible: boolean
  requestId: string
  messageId: string
  focusAgentRunId: string
  loading: boolean
  errorText: string
  detailByRequestId: Record<string, AgentDetailShellRecord>
}
