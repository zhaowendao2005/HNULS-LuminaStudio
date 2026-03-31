import type { NormalChatAgentRunSnapshot, NormalChatTaskDetail } from '@preload/types'

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

export function buildRuntimeAgentTreeFromTaskDetail(
  detail: NormalChatTaskDetail
): NormalChatRuntimeAgentTree | null {
  if (detail.agentRuns.length === 0) {
    return null
  }

  const agents = Object.fromEntries(
    detail.agentRuns.map((run) => [run.id, toAgentNode(run, detail.agentRuns)])
  )
  const rootAgent =
    detail.agentRuns.find((run) => run.parentAgentRunId === null) ?? detail.agentRuns[0]

  return {
    requestId: detail.requestId,
    rootAgentId: rootAgent.id,
    fallbackTriggered: detail.status === 'failed',
    agents
  }
}

export function buildRuntimeAgentSummary(
  detail: NormalChatTaskDetail,
  tree: NormalChatRuntimeAgentTree
): NormalChatRuntimeAgentStatusSummary {
  const agents = Object.values(tree.agents)
  return {
    requestId: detail.requestId,
    totalAgents: agents.length,
    runningAgents: agents.filter((agent) => agent.status === 'running').length,
    failedAgents: agents.filter((agent) => agent.status === 'failed').length,
    completedAgents: agents.filter((agent) => agent.status === 'completed').length,
    maxDepth: agents.reduce((maxDepth, agent) => Math.max(maxDepth, agent.depth), 0),
    fallbackTriggered: tree.fallbackTriggered
  }
}

function toAgentNode(
  run: NormalChatAgentRunSnapshot,
  allRuns: NormalChatAgentRunSnapshot[]
): NormalChatRuntimeAgentNode {
  return {
    agentId: run.id,
    depth: run.depth,
    roleKind: run.roleKind,
    taskKind: run.templateId,
    goal: run.goal,
    summary: run.finalText ?? run.goal,
    finalResult: run.finalText,
    status: normalizeStatus(run.status),
    retryCount: Math.max(0, run.reactCount - 1),
    errorMessage: run.errorMessage,
    childAgentIds: allRuns
      .filter((item) => item.parentAgentRunId === run.id)
      .map((item) => item.id),
    planHistory: [],
    helperInvocations: []
  }
}

function normalizeStatus(status: NormalChatAgentRunSnapshot['status']): string {
  if (status === 'succeeded') {
    return 'completed'
  }
  return status
}
