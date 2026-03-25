<template>
  <div
    class="nc-agent-tree-node-a9k2 space-y-3 rounded-2xl border border-gray-200 bg-white px-4 py-4"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span class="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
        depth {{ node.depth }}
      </span>
      <span class="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
        {{ node.roleKind }}
      </span>
      <span class="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
        {{ node.taskKind }}
      </span>
      <span class="rounded-full px-2.5 py-1 text-[11px] font-medium" :class="statusClass">
        {{ node.status }}
      </span>
      <span class="text-[12px] text-gray-400">retry {{ node.retryCount }}</span>
    </div>

    <div class="space-y-2 text-[13px] leading-6 text-gray-700">
      <p>
        <span class="font-medium text-gray-900">Goal:</span>
        {{ node.goal }}
      </p>
      <p>
        <span class="font-medium text-gray-900">Summary:</span>
        {{ node.finalResult ?? node.summary }}
      </p>
      <p v-if="node.errorMessage">
        <span class="font-medium text-gray-900">Error:</span>
        {{ node.errorMessage }}
      </p>
    </div>

    <div v-if="node.planHistory.length > 0" class="rounded-xl bg-gray-50 px-3 py-3">
      <p class="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-500">Plans</p>
      <div class="space-y-2">
        <div
          v-for="plan in node.planHistory"
          :key="`${node.agentId}-${plan.stepIndex}`"
          class="rounded-xl border border-gray-200 bg-white px-3 py-2"
        >
          <p class="text-[12px] text-gray-400">
            Step {{ plan.stepIndex }} · {{ plan.phase }} · {{ plan.action }}
          </p>
          <p class="mt-1 text-[13px] text-gray-700">{{ plan.reasoning || '无' }}</p>
          <p v-if="plan.statusText" class="mt-1 text-[12px] text-sky-600">
            状态文案：{{ plan.statusText }}
          </p>
          <p v-if="plan.budgetSummary" class="mt-1 text-[12px] text-gray-500">
            {{ plan.budgetSummary }}
          </p>
          <p v-if="plan.stopReason" class="mt-1 text-[12px] text-amber-600">
            收口原因：{{ plan.stopReason }}
          </p>
          <pre
            v-if="plan.actionsJson || plan.parsedJson"
            class="mt-2 overflow-x-auto rounded-lg bg-[#111827] px-3 py-2 text-[11px] leading-5 text-slate-100"
            >{{ plan.actionsJson || plan.parsedJson }}</pre
          >
        </div>
      </div>
    </div>

    <div v-if="node.helperInvocations.length > 0" class="rounded-xl bg-slate-50 px-3 py-3">
      <p class="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Helpers
      </p>
      <div class="space-y-2">
        <div
          v-for="call in node.helperInvocations"
          :key="call.callId"
          class="rounded-xl border border-slate-200 bg-white px-3 py-2"
        >
          <p class="text-[12px] text-slate-400">{{ call.displayName }} · {{ call.status }}</p>
          <p class="mt-1 text-[13px] text-slate-700">
            {{ call.resultSummary ?? call.failureSummary ?? '无摘要' }}
          </p>
          <pre
            v-if="call.argsJson"
            class="mt-2 overflow-x-auto rounded-lg bg-[#0f172a] px-3 py-2 text-[11px] leading-5 text-slate-100"
            >{{ call.argsJson }}</pre
          >
        </div>
      </div>
    </div>

    <div v-if="childNodes.length > 0" class="space-y-3 border-l border-dashed border-gray-300 pl-4">
      <AgentTreeNode
        v-for="childNode in childNodes"
        :key="childNode.agentId"
        :node="childNode"
        :tree="tree"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NormalChatAgentNode, NormalChatAgentTree } from '@preload/types'

const props = defineProps<{
  node: NormalChatAgentNode
  tree: NormalChatAgentTree
}>()

const childNodes = computed(() => {
  return props.node.childAgentIds
    .map((childId) => props.tree.agents[childId] ?? null)
    .filter((child): child is NormalChatAgentNode => child !== null)
})

const statusClass = computed(() => {
  if (props.node.status === 'completed') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (props.node.status === 'running') {
    return 'bg-sky-50 text-sky-700'
  }

  if (props.node.status === 'failed') {
    return 'bg-rose-50 text-rose-700'
  }

  return 'bg-amber-50 text-amber-700'
})
</script>
