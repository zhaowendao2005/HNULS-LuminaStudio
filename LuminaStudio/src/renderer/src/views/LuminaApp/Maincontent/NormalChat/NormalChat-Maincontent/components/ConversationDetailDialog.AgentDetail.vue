<template>
  <section class="space-y-4">
    <div
      v-if="!tree || !rootNode"
      class="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-[13px] text-gray-400"
    >
      当前 request 没有可用的 Agent Runtime 信息。
    </div>

    <template v-else>
      <div class="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-4">
        <p class="text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">
          Agent Runtime Summary
        </p>
        <p v-if="summary" class="mt-2 text-[13px] leading-6 text-sky-900">
          共 {{ summary.totalAgents }} 个 agent，运行中 {{ summary.runningAgents }}，已完成
          {{ summary.completedAgents }}，失败 {{ summary.failedAgents }}，最大深度
          {{ summary.maxDepth }}
          <span v-if="summary.fallbackTriggered">，已触发 fallback</span>
        </p>
        <p class="mt-2 text-[12px] text-sky-700/80">
          当前聚焦：{{ focusAgentRunId || tree.rootAgentId }}
        </p>
      </div>

      <AgentTreeNode :node="rootNode" :tree="tree" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  NormalChatAgentGraphSummarySnapshot,
  NormalChatAgentGraphTreeSnapshot
} from '@preload/types'
import AgentTreeNode from './AgentTreeNode.vue'

const props = defineProps<{
  tree: NormalChatAgentGraphTreeSnapshot | null
  summary: NormalChatAgentGraphSummarySnapshot | null
  focusAgentRunId: string
}>()

const rootNode = computed(() => {
  if (!props.tree) {
    return null
  }
  if (props.focusAgentRunId && props.tree.agents[props.focusAgentRunId]) {
    return props.tree.agents[props.focusAgentRunId] ?? null
  }
  return props.tree.agents[props.tree.rootAgentId] ?? null
})
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
