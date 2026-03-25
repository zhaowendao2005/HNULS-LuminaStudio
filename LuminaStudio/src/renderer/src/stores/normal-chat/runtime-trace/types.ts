import type { NormalChatAgentStatusSummary, NormalChatAgentTree } from '@preload/types'

export interface NormalChatRuntimeTraceState {
  treesByRequestId: Record<string, NormalChatAgentTree>
  summariesByRequestId: Record<string, NormalChatAgentStatusSummary>
  requestIdsByTopicId: Record<string, string>
}
