import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  NormalChatConversationRuntimeTraceUpsertEvent,
  NormalChatConversationTurnDetail
} from '@preload/types'
import type {
  NormalChatRuntimeAgentStatusSummary,
  NormalChatRuntimeAgentTree,
  NormalChatRuntimeTraceState
} from './types'
import { asRuntimeAgentTree } from './types'

function createEmptyState(): NormalChatRuntimeTraceState {
  return {
    treesByRequestId: {},
    summariesByRequestId: {},
    requestIdsByTopicId: {}
  }
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

export const useNormalChatRuntimeTraceStore = defineStore('normal-chat-runtime-trace', () => {
  const state = ref<NormalChatRuntimeTraceState>(createEmptyState())

  const currentRequestIds = computed(() => state.value.requestIdsByTopicId)

  function upsertRuntimeTrace(event: NormalChatConversationRuntimeTraceUpsertEvent): void {
    const tree = asRuntimeAgentTree(event.runtimeTrace.agentTree)
    const nextTrees = { ...state.value.treesByRequestId }
    const nextSummaries = { ...state.value.summariesByRequestId }

    if (tree) {
      nextTrees[event.requestId] = tree
      if (!nextSummaries[event.requestId]) {
        nextSummaries[event.requestId] = buildSummaryFromTree(event.requestId, tree)
      }
    } else {
      delete nextTrees[event.requestId]
      delete nextSummaries[event.requestId]
    }

    // TODO(normal-chat-rewrite): runtime-trace summary 结构后续由新系统定义。
    if (Object.prototype.hasOwnProperty.call(event, 'summary')) {
      if (event.summary && typeof event.summary === 'object') {
        nextSummaries[event.requestId] = event.summary as unknown as NormalChatRuntimeAgentStatusSummary
      } else if (event.summary === null) {
        delete nextSummaries[event.requestId]
      }
    }

    state.value.treesByRequestId = nextTrees
    state.value.summariesByRequestId = nextSummaries
    state.value.requestIdsByTopicId = {
      ...state.value.requestIdsByTopicId,
      [event.topicId]: event.requestId
    }
  }

  function hydrateTurnDetail(detail: NormalChatConversationTurnDetail | null): void {
    const tree = asRuntimeAgentTree(detail?.runtimeTrace?.agentTree)
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

  function getTreeByRequestId(requestId: string): NormalChatRuntimeAgentTree | null {
    return state.value.treesByRequestId[requestId] ?? null
  }

  function getSummaryByRequestId(requestId: string): NormalChatRuntimeAgentStatusSummary | null {
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
    upsertRuntimeTrace,
    hydrateTurnDetail,
    getTreeByRequestId,
    getSummaryByRequestId,
    deleteRequestTrace
  }
})
