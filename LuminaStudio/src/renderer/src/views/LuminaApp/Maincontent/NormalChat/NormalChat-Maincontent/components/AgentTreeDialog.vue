<template>
  <div
    v-if="snapshot.visible"
    class="nc-agent-tree-dialog-a9k2 fixed inset-0 z-[75] flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
  >
    <div
      class="nc-agent-tree-dialog-panel-a9k2 flex h-[760px] w-[1120px] flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--nc-shadow-dialog)]"
    >
      <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div class="min-w-0">
          <h2 class="truncate text-[16px] font-semibold text-gray-900">
            {{ dialogTitle || 'Agent Runtime' }}
          </h2>
          <p class="mt-1 text-[12px] leading-5 text-gray-500">
            Runtime tree, summary, and plan history are loaded from the dedicated agent detail
            shell.
          </p>
        </div>

        <button
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          type="button"
          @click="agentDetailStore.closeDialog"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-6 py-5">
        <div
          v-if="!tree || !rootNode"
          class="flex h-full items-center justify-center text-[13px] text-gray-400"
        >
          No agent runtime tree is available for this turn.
        </div>

        <div v-else class="space-y-4">
          <div class="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-4">
            <p class="text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">
              Agent Runtime Summary
            </p>
            <p v-if="summary" class="mt-2 text-[13px] leading-6 text-sky-900">
              {{ summary.totalAgents }} agents, {{ summary.runningAgents }} running,
              {{ summary.completedAgents }} completed, {{ summary.failedAgents }} failed, max depth
              {{ summary.maxDepth }}
              <span v-if="summary.fallbackTriggered">, fallback triggered</span>
            </p>
            <p class="mt-2 text-[12px] text-sky-700/80">
              Source: {{ detail?.sourceLabel ?? 'unknown' }}
            </p>
          </div>

          <AgentTreeNode :node="rootNode" :tree="tree" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { X } from 'lucide-vue-next'
import { useNormalChatAgentDetailShellStore } from '@renderer/stores/normal-chat/agent-detail-shell/agent-detail-shell.store'
import AgentTreeNode from './AgentTreeNode.vue'

const agentDetailStore = useNormalChatAgentDetailShellStore()
const { snapshot, detail, dialogTitle, tree, summary, rootNode } = storeToRefs(agentDetailStore)
</script>
