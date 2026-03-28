import type { NormalChatConversationDevDetailMockId } from '@preload/types'
import {
  type NormalChatRuntimeAgentStatusSummary,
  type NormalChatRuntimeAgentTree
} from '../runtime-trace/types'
import { getNormalChatConversationDevDetailMockIdByRequestId } from '../conversation/conversation.mock'
import type { AgentDetailShellRecord, AgentDetailShellSnapshot } from './agent-detail-shell.types'

function createRecord(input: {
  requestId: string
  messageId: string
  topicTitle: string
  description: string
  summary: NormalChatRuntimeAgentStatusSummary | null
  tree: NormalChatRuntimeAgentTree | null
}): AgentDetailShellRecord {
  return {
    requestId: input.requestId,
    messageId: input.messageId,
    assistantName: 'Dev Mock Assistant',
    topicTitle: input.topicTitle,
    description: input.description,
    summary: input.summary,
    tree: input.tree,
    sourceLabel: 'mock'
  }
}

const agentHierarchyTree: NormalChatRuntimeAgentTree = {
  requestId: 'detail-request-agent-hierarchy',
  rootAgentId: 'director-root',
  fallbackTriggered: true,
  agents: {
    'director-root': {
      agentId: 'director-root',
      depth: 0,
      roleKind: 'director',
      taskKind: 'planning',
      goal: 'Coordinate worker and repair branches.',
      summary: 'Dispatch sub-agents and merge the final answer.',
      finalResult: 'Merged worker evidence and fallback repair summary.',
      status: 'completed',
      retryCount: 0,
      errorMessage: null,
      childAgentIds: ['worker-1', 'repair-1'],
      planHistory: [
        {
          stepIndex: 1,
          phase: 'plan',
          action: 'dispatch',
          reasoning: 'Split evidence collection and repair into separate branches.',
          statusText: 'Dispatching agents',
          budgetSummary: '2 branches / 1 fallback path',
          stopReason: null,
          actionsJson: '{"workers":1,"repair":1}',
          parsedJson: null
        }
      ],
      helperInvocations: []
    },
    'worker-1': {
      agentId: 'worker-1',
      depth: 1,
      roleKind: 'worker',
      taskKind: 'search',
      goal: 'Collect signal transduction evidence clusters.',
      summary: 'Searched three evidence clusters and returned citations.',
      finalResult: 'Collected 3 citation groups.',
      status: 'completed',
      retryCount: 0,
      errorMessage: null,
      childAgentIds: [],
      planHistory: [
        {
          stepIndex: 1,
          phase: 'execute',
          action: 'search',
          reasoning: 'Run the dedicated search helper against the evidence topic.',
          statusText: 'Collecting evidence',
          budgetSummary: null,
          stopReason: null,
          actionsJson: null,
          parsedJson: '{"query":"signal transduction review"}'
        }
      ],
      helperInvocations: [
        {
          callId: 'worker-search-helper',
          helperId: 'search-helper',
          displayName: 'Search Helper',
          status: 'success',
          argsJson: '{"query":"signal transduction review"}',
          outputJson: '{"hits":3}',
          errorMessage: null,
          resultSummary: 'Search completed with 3 hits.',
          failureSummary: null,
          startedAt: '2026-03-28T00:00:01.000Z'
        }
      ]
    },
    'repair-1': {
      agentId: 'repair-1',
      depth: 1,
      roleKind: 'repair',
      taskKind: 'fallback',
      goal: 'Prepare a safe fallback summary if evidence is incomplete.',
      summary: 'Fallback branch retried once and prepared a summary.',
      finalResult: 'Prepared fallback summary.',
      status: 'completed',
      retryCount: 1,
      errorMessage: null,
      childAgentIds: [],
      planHistory: [
        {
          stepIndex: 1,
          phase: 'repair',
          action: 'fallback-summary',
          reasoning: 'Use a safer synthesis path after partial evidence collection.',
          statusText: 'Fallback active',
          budgetSummary: null,
          stopReason: 'repair branch finalized',
          actionsJson: null,
          parsedJson: '{"mode":"fallback-summary"}'
        }
      ],
      helperInvocations: []
    }
  }
}

const detailRecords: Record<NormalChatConversationDevDetailMockId, AgentDetailShellRecord> = {
  'detail-streaming-baseline': createRecord({
    requestId: 'detail-request-streaming-baseline',
    messageId: 'detail-message-streaming-baseline',
    topicTitle: 'Streaming Baseline',
    description: 'This turn does not contain an agent runtime tree.',
    summary: null,
    tree: null
  }),
  'detail-functioncall-matrix': createRecord({
    requestId: 'detail-request-functioncall-matrix',
    messageId: 'detail-message-functioncall-matrix',
    topicTitle: 'FunctionCall Matrix',
    description: 'Tool-only turn without agent runtime tree.',
    summary: null,
    tree: null
  }),
  'detail-agent-hierarchy': createRecord({
    requestId: 'detail-request-agent-hierarchy',
    messageId: 'detail-message-agent-hierarchy',
    topicTitle: 'Agent Hierarchy',
    description: 'Mock multi-agent runtime with plan history and helper calls.',
    summary: {
      requestId: 'detail-request-agent-hierarchy',
      totalAgents: 3,
      runningAgents: 0,
      failedAgents: 0,
      completedAgents: 3,
      maxDepth: 1,
      fallbackTriggered: true
    },
    tree: agentHierarchyTree
  }),
  'detail-request-interrupt': createRecord({
    requestId: 'detail-request-interrupt',
    messageId: 'detail-message-interrupt',
    topicTitle: 'Interrupt And Error',
    description: 'Interrupted turn retains no completed agent tree.',
    summary: null,
    tree: null
  })
}

function cloneRecord(record: AgentDetailShellRecord): AgentDetailShellRecord {
  return structuredClone(record)
}

function resolveRecordByRequestId(requestId: string): AgentDetailShellRecord {
  const detailMockId = getNormalChatConversationDevDetailMockIdByRequestId(requestId)
  if (detailMockId && detailRecords[detailMockId]) {
    return cloneRecord({
      ...detailRecords[detailMockId],
      requestId
    })
  }

  return cloneRecord(detailRecords['detail-agent-hierarchy'])
}

export const agentDetailShellMock: AgentDetailShellSnapshot = {
  visible: false,
  requestId: 'detail-request-agent-hierarchy',
  messageId: 'detail-message-agent-hierarchy',
  loading: false,
  errorText: '',
  detailByRequestId: {
    'detail-request-agent-hierarchy': cloneRecord(detailRecords['detail-agent-hierarchy'])
  }
}

export const agentDetailShellMockApi = {
  createSnapshot(): AgentDetailShellSnapshot {
    return structuredClone(agentDetailShellMock)
  },
  async getConversationDetail(requestId: string): Promise<AgentDetailShellRecord> {
    return resolveRecordByRequestId(requestId)
  }
}
