import type { NormalChatTaskDetail } from '@preload/types'
import {
  buildRuntimeAgentSummary,
  buildRuntimeAgentTreeFromTaskDetail,
  type NormalChatRuntimeAgentStatusSummary,
  type NormalChatRuntimeAgentTree
} from '../runtime-trace/types'
import type { AgentDetailShellRecord, AgentDetailShellSnapshot } from './agent-detail-shell.types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'Normal chat agent detail request failed')
  }

  return response.data as T
}

function createEmptySnapshot(): AgentDetailShellSnapshot {
  return {
    visible: false,
    requestId: '',
    messageId: '',
    focusAgentRunId: '',
    loading: false,
    errorText: '',
    detailByRequestId: {}
  }
}

function toRecord(detail: NormalChatTaskDetail): AgentDetailShellRecord {
  const legacyRuntimeTrace = (
    detail as NormalChatTaskDetail & {
      runtimeTrace?: { agentTree?: NormalChatRuntimeAgentTree | null } | null
    }
  ).runtimeTrace

  const normalizedDetail: NormalChatTaskDetail = {
    ...detail,
    messages: detail.messages ?? [],
    agentRuns: detail.agentRuns ?? [],
    modelCalls: detail.modelCalls ?? [],
    actionRuns: detail.actionRuns ?? [],
    runtimeEvents: detail.runtimeEvents ?? []
  }
  const assistantMessage =
    normalizedDetail.messages.find((message) => message.role === 'assistant') ?? null
  const tree =
    normalizedDetail.agentRuns.length > 0
      ? buildRuntimeAgentTreeFromTaskDetail(normalizedDetail)
      : (legacyRuntimeTrace?.agentTree ?? null)
  const summary: NormalChatRuntimeAgentStatusSummary | null = tree
    ? normalizedDetail.agentRuns.length > 0
      ? buildRuntimeAgentSummary(normalizedDetail, tree)
      : {
          requestId: normalizedDetail.requestId,
          totalAgents: Object.keys(tree.agents ?? {}).length,
          runningAgents: Object.values(tree.agents ?? {}).filter(
            (agent) => agent.status === 'running'
          ).length,
          failedAgents: Object.values(tree.agents ?? {}).filter(
            (agent) => agent.status === 'failed'
          ).length,
          completedAgents: Object.values(tree.agents ?? {}).filter(
            (agent) => agent.status === 'completed'
          ).length,
          maxDepth: Object.values(tree.agents ?? {}).reduce(
            (maxDepth, agent) => Math.max(maxDepth, agent.depth),
            0
          ),
          fallbackTriggered: Boolean(tree.fallbackTriggered)
        }
    : null

  return {
    requestId: normalizedDetail.requestId,
    messageId: assistantMessage?.id ?? '',
    assistantName: normalizedDetail.assistantName,
    topicTitle: normalizedDetail.topicTitle,
    description: tree
      ? `Loaded agent tree with ${summary?.totalAgents ?? 0} node(s).`
      : 'No agent tree is available for this task.',
    summary,
    tree: tree as NormalChatRuntimeAgentTree | null,
    sourceLabel: normalizedDetail.agentRuns.length > 0 ? 'task-detail' : 'legacy-runtime-trace'
  }
}

export class AgentDetailShellDatasource {
  async loadSnapshot(): Promise<AgentDetailShellSnapshot> {
    return createEmptySnapshot()
  }

  async getConversationDetail(requestId: string): Promise<AgentDetailShellRecord> {
    if (!requestId) {
      throw new Error('Missing requestId for agent detail.')
    }

    const detail = await window.api.normalChat.getConversationTurnDetail({ requestId }).then(unwrap)

    if (!detail) {
      throw new Error(`Task detail not found for request ${requestId}.`)
    }

    return toRecord(detail)
  }
}
