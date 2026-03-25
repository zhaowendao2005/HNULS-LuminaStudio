<template>
  <div
    v-if="summary"
    class="nc-agent-status-bar-block-a9k2 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">
          Agent Runtime
        </p>
        <p class="mt-1 text-[13px] leading-6 text-sky-900">
          共 {{ summary.totalAgents }} 个 agent，运行中 {{ summary.runningAgents }}，已完成
          {{ summary.completedAgents }}，失败 {{ summary.failedAgents }}，最大深度
          {{ summary.maxDepth }}
          <span v-if="summary.fallbackTriggered">，已触发 fallback</span>
        </p>
      </div>

      <button
        class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700 transition-colors hover:bg-sky-100"
        type="button"
        title="查看运行树"
        @click="emit('open-tree')"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path d="M6 5v14" />
          <path d="M6 8h5" />
          <path d="M11 8v8" />
          <path d="M11 12h7" />
          <path d="M18 12v6" />
          <circle cx="6" cy="5" r="1.5" fill="currentColor" />
          <circle cx="11" cy="8" r="1.5" fill="currentColor" />
          <circle cx="18" cy="12" r="1.5" fill="currentColor" />
          <circle cx="18" cy="18" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNormalChatAgentTraceStore } from '@renderer/stores/normal-chat/agent-trace/store'

const props = defineProps<{
  requestId: string
}>()

const emit = defineEmits<{
  'open-tree': []
}>()

const agentTraceStore = useNormalChatAgentTraceStore()

const summary = computed(() => {
  return props.requestId ? agentTraceStore.getSummaryByRequestId(props.requestId) : null
})
</script>
