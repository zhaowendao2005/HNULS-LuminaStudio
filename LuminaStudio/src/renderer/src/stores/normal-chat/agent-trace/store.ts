import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  NormalChatAgentStatusSummary,
  NormalChatAgentTree,
  NormalChatConversationAgentTreeUpsertEvent,
  NormalChatConversationTurnDetail
} from '@preload/types'
import type { NormalChatAgentTraceState } from './types'

function createEmptyState(): NormalChatAgentTraceState {
  return {
    treesByRequestId: {},
    summariesByRequestId: {},
    requestIdsByTopicId: {}
  }
}

function buildSummaryFromTree(
  requestId: string,
  tree: NormalChatAgentTree
): NormalChatAgentStatusSummary {
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

export const useNormalChatAgentTraceStore = defineStore('normal-chat-agent-trace', () => {
  const state = ref<NormalChatAgentTraceState>(createEmptyState())

  const currentRequestIds = computed(() => state.value.requestIdsByTopicId)

  function upsertRuntimeTree(event: NormalChatConversationAgentTreeUpsertEvent): void {
    state.value.treesByRequestId = {
      ...state.value.treesByRequestId,
      [event.requestId]: event.tree
    }
    state.value.summariesByRequestId = {
      ...state.value.summariesByRequestId,
      [event.requestId]: event.summary
    }
    state.value.requestIdsByTopicId = {
      ...state.value.requestIdsByTopicId,
      [event.topicId]: event.requestId
    }
  }

  function hydrateTurnDetail(detail: NormalChatConversationTurnDetail | null): void {
    const tree = detail?.responsePayload?.agentTree
    if (!detail || !tree) {
      return
    }

    state.value.treesByRequestId = {
      ...state.value.treesByRequestId,
      [detail.requestId]: tree
    }
    state.value.summariesByRequestId = {
      ...state.value.summariesByRequestId,
      [detail.requestId]: buildSummaryFromTree(detail.requestId, tree)
    }
    state.value.requestIdsByTopicId = {
      ...state.value.requestIdsByTopicId,
      [detail.topicId]: detail.requestId
    }
  }

  function getTreeByRequestId(requestId: string): NormalChatAgentTree | null {
    return state.value.treesByRequestId[requestId] ?? null
  }

  function getSummaryByRequestId(requestId: string): NormalChatAgentStatusSummary | null {
    return state.value.summariesByRequestId[requestId] ?? null
  }

  function deleteRequestTrace(requestId: string): void {
    const nextTrees = { ...state.value.treesByRequestId }
    const nextSummaries = { ...state.value.summariesByRequestId }
    delete nextTrees[requestId]
    delete nextSummaries[requestId]

    state.value = {
      ...state.value,
      treesByRequestId: nextTrees,
      summariesByRequestId: nextSummaries
    }
  }

  return {
    state,
    currentRequestIds,
    upsertRuntimeTree,
    hydrateTurnDetail,
    getTreeByRequestId,
    getSummaryByRequestId,
    deleteRequestTrace
  }
})
