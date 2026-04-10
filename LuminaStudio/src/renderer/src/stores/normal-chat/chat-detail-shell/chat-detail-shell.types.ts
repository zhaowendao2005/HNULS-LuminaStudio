import type {
  NormalChatAgentGraphSummarySnapshot,
  NormalChatAgentGraphTreeSnapshot,
  NormalChatFunctionCallMessagePart,
  NormalChatSubAgentMessagePart
} from '@preload/types'

export type ChatDetailPage =
  | 'overview'
  | 'llm-call'
  | 'functioncall-overview'
  | 'functioncall-detail'
  | 'agent'

export type ChatDetailDataViewMode = 'json' | 'yaml'

export interface ChatDetailShellOpenPayload {
  requestId: string
  messageId: string
  page?: ChatDetailPage
  selectedCallId?: string
  selectedFunctioncallId?: string
  focusAgentRunId?: string
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
  seq: number
  agentRunId: string
  parentActionRunId: string | null
  roundIndex: number
  depth: number
  createdAt: string
  status: string
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
  actionKey: string
  actionKind: string
  mode: string | null
  agentRunId: string
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
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
  childAgentRunId: string | null
}

export interface ChatDetailShellSubagentItem {
  partId: string
  goal: string
  childAgentRunId: string | null
  sourceFunctioncallId: string | null
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  depth: number
  status: NormalChatSubAgentMessagePart['status']
}

export type ChatDetailRuntimeNodeKind =
  | 'user-query'
  | 'llm-call'
  | 'action'
  | 'functioncall'
  | 'subagent'
  | 'runtime-hub'

export type ChatDetailRuntimeNodeTone = 'neutral' | 'active' | 'success' | 'warning' | 'danger'

export type ChatDetailRuntimeDrawerSectionId =
  | 'summary'
  | 'request'
  | 'stream'
  | 'response'
  | 'prompt'

export interface ChatDetailRuntimeDrawerSection {
  id: ChatDetailRuntimeDrawerSectionId
  title: string
  description: string
  kind: 'documents' | 'structured' | 'text'
  documents?: ChatDetailShellDocItem[]
  payload?: unknown
  highlightKeys?: string[]
}

export interface ChatDetailRuntimeNode {
  id: string
  kind: ChatDetailRuntimeNodeKind
  x: number
  y: number
  width: number
  height: number
  title: string
  subtitle: string
  meta: string
  statusLabel: string
  tone: ChatDetailRuntimeNodeTone
  accentColor: string
  borderColor: string
  agentRunId: string | null
  childAgentRunId: string | null
  drawerTitle: string
  drawerSubtitle: string
  drawerSections: ChatDetailRuntimeDrawerSection[]
}

export type ChatDetailRuntimeEdgeAnchorSide = 'left' | 'right'

export interface ChatDetailRuntimeEdge {
  id: string
  source: string
  target: string
  label: string
  dashed: boolean
  stroke: string
  sourceAnchorSide: ChatDetailRuntimeEdgeAnchorSide
  targetAnchorSide: ChatDetailRuntimeEdgeAnchorSide
}

export interface ChatDetailRuntimeGraph {
  nodes: ChatDetailRuntimeNode[]
  edges: ChatDetailRuntimeEdge[]
  canvasWidth: number
  canvasHeight: number
}

export interface ChatDetailShellRecord {
  requestId: string
  messageId: string
  assistantName: string
  topicTitle: string
  requestInput: string
  requestStatus: string
  requestPhase: string
  highWatermark: number
  description: string
  hasLlmCallDetails: boolean
  llmCallEmptyMessage: string | null
  calls: ChatDetailShellCallItem[]
  functioncalls: ChatDetailShellFunctioncallItem[]
  subagents: ChatDetailShellSubagentItem[]
  agentTree: NormalChatAgentGraphTreeSnapshot | null
  agentSummary: NormalChatAgentGraphSummarySnapshot | null
  runtimeGraph: ChatDetailRuntimeGraph | null
}

export interface ChatDetailShellSnapshot {
  visible: boolean
  requestId: string
  messageId: string
  currentPage: ChatDetailPage
  selectedCallId: string
  selectedFunctioncallId: string
  focusAgentRunId: string
  selectedRuntimeNodeId: string
  runtimeDrawerVisible: boolean
  selectedRuntimeSectionId: ChatDetailRuntimeDrawerSectionId
  selectedGroupId: ChatDetailShellDocGroupId
  selectedDocId: string
  requestViewMode: ChatDetailDataViewMode
  responseViewMode: ChatDetailDataViewMode
  schemaViewMode: ChatDetailDataViewMode
  loading: boolean
  errorText: string
  detailByRequestId: Record<string, ChatDetailShellRecord>
}
