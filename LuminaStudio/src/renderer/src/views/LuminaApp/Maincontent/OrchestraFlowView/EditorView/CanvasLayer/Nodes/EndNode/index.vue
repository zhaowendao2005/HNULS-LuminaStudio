<template>
  <div
    class="of-node of-end-node flex items-center min-w-[180px] rounded-lg border-2 border-solid border-rose-400 bg-white shadow-sm transition-all hover:shadow-md"
  >
    <!-- 输入 Handle（结束节点只有输入） -->
    <Handle
      type="target"
      position="left"
      id="target"
      class="!bg-rose-400 !w-3 !h-3 !border-2 !border-white"
    />

    <div class="node-content flex items-center gap-3 p-3">
      <!-- 节点图标 -->
      <div
        class="node-icon flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <!-- 节点信息 -->
      <div class="node-info">
        <div class="node-title font-medium text-gray-900">{{ data.title }}</div>
        <div class="node-desc text-sm text-gray-500">{{ data.desc }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle } from '@vue-flow/core'
import type { OFEndNodeData } from '@preload/types'

defineProps<{
  data: OFEndNodeData
}>()
</script>

<style scoped>
.of-end-node {
  font-family: inherit;
}

.of-end-node:hover {
  border-color: #f43f5e;
}
</style>
