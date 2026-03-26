<template>
  <div
    v-if="visible"
    class="nc-agent-tree-dialog-a9k2 fixed inset-0 z-[75] flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
  >
    <div
      class="nc-agent-tree-dialog-panel-a9k2 flex h-[760px] w-[1120px] flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--nc-shadow-dialog)]"
    >
      <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div class="min-w-0">
          <h2 class="truncate text-[16px] font-semibold text-gray-900">Agent Tree</h2>
          <p class="mt-1 text-[12px] leading-5 text-gray-500">
            展示当前 request 的递归式 director / worker / repair 运行树和每轮 plan JSON。
          </p>
        </div>

        <button
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          type="button"
          @click="emit('update:visible', false)"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-6 py-5">
        <div
          v-if="!tree || !rootNode"
          class="flex h-full items-center justify-center text-[13px] text-gray-400"
        >
          当前 request 还没有可用的 agent tree。
        </div>

        <div v-else class="space-y-4">
          <AgentStatusBarBlock :request-id="requestId" @open-tree="noop" />
          <AgentTreeNode :node="rootNode" :tree="tree" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useNormalChatRuntimeTraceStore } from '@renderer/stores/normal-chat/runtime-trace/store'
import AgentStatusBarBlock from './AgentStatusBarBlock.vue'
import AgentTreeNode from './AgentTreeNode.vue'

const props = defineProps<{
  visible: boolean
  requestId: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const agentTraceStore = useNormalChatRuntimeTraceStore()

const tree = computed(() => {
  // TODO(normal-chat-rewrite): 兼容旧运行树数据，后续改为新系统的数据查询接口。
  return props.requestId ? agentTraceStore.getTreeByRequestId(props.requestId) : null
})

const rootNode = computed(() => {
  if (!tree.value?.rootAgentId) {
    return null
  }

  return tree.value.agents[tree.value.rootAgentId] ?? null
})

function noop(): void {
  // dialog 内不需要二次打开
}
</script>
