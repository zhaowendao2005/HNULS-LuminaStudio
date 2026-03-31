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
    loading: false,
    errorText: '',
    detailByRequestId: {}
  }
}

function toRecord(detail: NormalChatTaskDetail): AgentDetailShellRecord {
  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null
  const tree = buildRuntimeAgentTreeFromTaskDetail(detail)
  const summary: NormalChatRuntimeAgentStatusSummary | null = tree
    ? buildRuntimeAgentSummary(detail, tree)
    : null

  return {
    requestId: detail.requestId,
    messageId: assistantMessage?.id ?? '',
    assistantName: detail.assistantName,
    topicTitle: detail.topicTitle,
    description: tree
      ? `Loaded agent tree with ${summary?.totalAgents ?? 0} node(s).`
      : 'No agent tree is available for this task.',
    summary,
    tree: tree as NormalChatRuntimeAgentTree | null,
    sourceLabel: 'task-detail'
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
