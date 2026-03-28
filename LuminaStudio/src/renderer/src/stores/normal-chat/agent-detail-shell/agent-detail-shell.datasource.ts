import type { NormalChatConversationTurnDetail } from '@preload/types'
import {
  asRuntimeAgentTree,
  type NormalChatRuntimeAgentStatusSummary,
  type NormalChatRuntimeAgentTree
} from '../runtime-trace/types'
import { agentDetailShellMockApi } from './agent-detail-shell.mock'
import type { AgentDetailShellRecord, AgentDetailShellSnapshot } from './agent-detail-shell.types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'Normal chat agent detail request failed')
  }

  return response.data as T
}

function buildSummaryFromTree(
  requestId: string,
  tree: NormalChatRuntimeAgentTree
): NormalChatRuntimeAgentStatusSummary {
  const agents = Object.values(tree.agents)
  return {
    requestId,
    totalAgents: agents.length,
    runningAgents: agents.filter((agent) => agent.status === 'running').length,
    failedAgents: agents.filter((agent) => agent.status === 'failed').length,
    completedAgents: agents.filter((agent) => agent.status === 'completed').length,
    maxDepth: agents.reduce((maxDepth, agent) => Math.max(maxDepth, agent.depth), 0),
    fallbackTriggered: tree.fallbackTriggered
  }
}

function toRecord(detail: NormalChatConversationTurnDetail): AgentDetailShellRecord {
  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null
  const tree = asRuntimeAgentTree(detail.runtimeTrace?.agentTree)
  const summary = tree ? buildSummaryFromTree(detail.requestId, tree) : null

  return {
    requestId: detail.requestId,
    messageId: assistantMessage?.id ?? '',
    assistantName: detail.assistantName,
    topicTitle: detail.topicTitle,
    description: tree
      ? `Loaded runtime tree with ${summary?.totalAgents ?? 0} agent node(s).`
      : 'No runtime tree is available for this turn.',
    summary,
    tree,
    sourceLabel: 'ipc'
  }
}

export class AgentDetailShellDatasource {
  async loadSnapshot(): Promise<AgentDetailShellSnapshot> {
    return agentDetailShellMockApi.createSnapshot()
  }

  async getConversationDetail(requestId: string): Promise<AgentDetailShellRecord> {
    if (!requestId) {
      return agentDetailShellMockApi.getConversationDetail('')
    }

    const detail = await window.api.normalChat
      .getConversationTurnDetail({ requestId })
      .then(unwrap)
      .catch(() => null)

    if (!detail) {
      return agentDetailShellMockApi.getConversationDetail(requestId)
    }

    const record = toRecord(detail)
    if (!record.tree) {
      return agentDetailShellMockApi.getConversationDetail(requestId)
    }

    return record
  }
}
