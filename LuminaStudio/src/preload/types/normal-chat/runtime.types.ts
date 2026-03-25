import type {
  NormalChatAgentDecisionAction,
  NormalChatAgentRoleKind,
  NormalChatAgentStatus,
  NormalChatAgentTaskKind,
  NormalChatCallMode,
  NormalChatConversationStatusPhase,
  NormalChatCostMode
} from './common.types'
import type {
  NormalChatConversationMessage,
  NormalChatConversationPromptMessage
} from './conversation.types'

export interface NormalChatAgentToolSelection {
  helperId: string
  displayName: string
  reason: string | null
}

export interface NormalChatAgentDecisionRecord {
  stepIndex: number
  action: NormalChatAgentDecisionAction
  rawText: string
  parsedJson: string | null
  repairAttempted: boolean
  validationError: string | null
  reasoning: string | null
  helperId: string | null
  helperArgsJson: string | null
  childGoal: string | null
  createdAt: string
}

export interface NormalChatAgentHelperInvocationRecord {
  callId: string
  helperId: string
  displayName: string
  status: 'running' | 'success' | 'error' | 'aborted'
  argsJson: string
  outputJson: string
  errorMessage: string | null
  resultSummary: string | null
  failureSummary: string | null
  startedAt: string
  completedAt: string | null
}

export interface NormalChatAgentNode {
  agentId: string
  parentAgentId: string | null
  depth: number
  roleKind: NormalChatAgentRoleKind
  taskKind: NormalChatAgentTaskKind
  goal: string
  summary: string
  callMode: NormalChatCallMode
  costMode: NormalChatCostMode
  retryCount: number
  status: NormalChatAgentStatus
  conversationWindow: NormalChatConversationPromptMessage[]
  selectedHelpers: NormalChatAgentToolSelection[]
  planHistory: NormalChatAgentDecisionRecord[]
  helperInvocations: NormalChatAgentHelperInvocationRecord[]
  childAgentIds: string[]
  finalResult: string | null
  errorMessage: string | null
  startedAt: string
  updatedAt: string
  completedAt: string | null
}

export interface NormalChatAgentTree {
  requestId: string
  rootAgentId: string
  maxRecursionDepth: number
  fallbackTriggered: boolean
  agents: Record<string, NormalChatAgentNode>
}

export interface NormalChatAgentStatusSummary {
  requestId: string
  totalAgents: number
  runningAgents: number
  failedAgents: number
  completedAgents: number
  maxDepth: number
  fallbackTriggered: boolean
}

export interface NormalChatAgentExecutionToolInput {
  query: string
  topK: number
  sort: 'relevance' | 'pub_date'
  startDate?: string
  endDate?: string
}

export interface NormalChatAgentExecutionToolCall {
  toolName: 'pubmed-search'
  title: string
  reason: string | null
  input: NormalChatAgentExecutionToolInput
}

export interface NormalChatAgentExecutionToolCallRecord {
  callId: string
  toolName: 'pubmed-search'
  title: string
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  status: 'running' | 'success' | 'error' | 'aborted'
  input: string
  output: string
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

export interface NormalChatAgentExecutionRoundRecord {
  roundIndex: number
  mode: 'tool' | 'answer'
  reason: string | null
  startedAt: string
  completedAt: string | null
  toolCalls: NormalChatAgentExecutionToolCallRecord[]
}

export interface NormalChatAgentExecutionTrace {
  maxRounds: number
  completed: boolean
  aborted: boolean
  finalMode: 'tool' | 'answer' | 'error'
  rounds: NormalChatAgentExecutionRoundRecord[]
}

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

export interface NormalChatConversationAssistantPartUpsertEvent extends NormalChatConversationBaseEvent {
  type: 'assistant-part-upsert'
  part: NormalChatConversationMessage['parts'][number]
}

export interface NormalChatConversationMessageCommittedEvent extends NormalChatConversationBaseEvent {
  type: 'message-committed'
  message: NormalChatConversationMessage
}

export interface NormalChatConversationAgentTreeUpsertEvent extends NormalChatConversationBaseEvent {
  type: 'agent-tree-upsert'
  tree: NormalChatAgentTree
  summary: NormalChatAgentStatusSummary
}

export interface NormalChatConversationFinishEvent extends NormalChatConversationBaseEvent {
  type: 'finish'
  assistantMessageId: string | null
}

export interface NormalChatConversationErrorEvent extends NormalChatConversationBaseEvent {
  type: 'error'
  message: string
  rawErrorJson?: string | null
}

export type NormalChatConversationStreamEvent =
  | NormalChatConversationStatusEvent
  | NormalChatConversationAssistantChunkEvent
  | NormalChatConversationAssistantPartUpsertEvent
  | NormalChatConversationMessageCommittedEvent
  | NormalChatConversationAgentTreeUpsertEvent
  | NormalChatConversationFinishEvent
  | NormalChatConversationErrorEvent
