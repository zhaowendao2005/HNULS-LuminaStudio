<template>
  <section class="h-full">
    <div
      v-if="!graph || graph.nodes.length === 0"
      class="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-[13px] text-gray-400"
    >
      当前 request 没有可用的 Agent Runtime 信息。
    </div>

    <ConversationDetailDialogAgentRuntimeGraph
      v-else
      class="h-full"
      :graph="graph"
      :selected-node-id="selectedNodeId"
      @select-node="emit('select-node', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import type { ChatDetailRuntimeGraph } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'
import ConversationDetailDialogAgentRuntimeGraph from './ConversationDetailDialog.AgentRuntimeGraph.vue'

defineProps<{
  graph: ChatDetailRuntimeGraph | null
  selectedNodeId: string
}>()

const emit = defineEmits<{
  'select-node': [nodeId: string]
}>()
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
