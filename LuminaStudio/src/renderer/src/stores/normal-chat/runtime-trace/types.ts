export interface NormalChatRuntimeAgentPlanRecord {
  stepIndex: number
  phase: string
  action: string
  reasoning: string | null
  statusText: string | null
  budgetSummary: string | null
  stopReason: string | null
  actionsJson: string | null
  parsedJson: string | null
}

export interface NormalChatRuntimeAgentHelperInvocationRecord {
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
}

export interface NormalChatRuntimeAgentNode {
  agentId: string
  depth: number
  roleKind: string
  taskKind: string
  goal: string
  summary: string
  finalResult: string | null
  status: string
  retryCount: number
  errorMessage: string | null
  childAgentIds: string[]
  planHistory: NormalChatRuntimeAgentPlanRecord[]
  helperInvocations: NormalChatRuntimeAgentHelperInvocationRecord[]
}

export interface NormalChatRuntimeAgentTree {
  requestId: string
  rootAgentId: string
  fallbackTriggered: boolean
  agents: Record<string, NormalChatRuntimeAgentNode>
}

export interface NormalChatRuntimeAgentStatusSummary {
  requestId: string
  totalAgents: number
  runningAgents: number
  failedAgents: number
  completedAgents: number
  maxDepth: number
  fallbackTriggered: boolean
}

export interface NormalChatRuntimeTraceState {
  treesByRequestId: Record<string, NormalChatRuntimeAgentTree>
  summariesByRequestId: Record<string, NormalChatRuntimeAgentStatusSummary>
  requestIdsByTopicId: Record<string, string>
}

/**
 * 兼容层：旧 agent-tree 类型已经从 preload 契约移除，这里仅做 renderer 本地兜底解析。
 * TODO(normal-chat-rewrite): 新系统上线后用新结构替换该解析逻辑。
 */
export function asRuntimeAgentTree(value: unknown): NormalChatRuntimeAgentTree | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const tree = value as Record<string, unknown>
  if (
    typeof tree.requestId !== 'string' ||
    typeof tree.rootAgentId !== 'string' ||
    typeof tree.fallbackTriggered !== 'boolean' ||
    !tree.agents ||
    typeof tree.agents !== 'object'
  ) {
    return null
  }

  return tree as unknown as NormalChatRuntimeAgentTree
}
