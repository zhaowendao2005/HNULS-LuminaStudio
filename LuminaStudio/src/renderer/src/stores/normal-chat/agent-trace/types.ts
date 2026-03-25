import type { NormalChatAgentStatusSummary, NormalChatAgentTree } from '@preload/types'

export interface NormalChatAgentTraceState {
  treesByRequestId: Record<string, NormalChatAgentTree>
  summariesByRequestId: Record<string, NormalChatAgentStatusSummary>
  requestIdsByTopicId: Record<string, string>
}
