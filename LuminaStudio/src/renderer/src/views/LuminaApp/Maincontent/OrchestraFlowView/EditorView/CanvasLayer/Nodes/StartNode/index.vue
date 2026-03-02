<template>
  <div
    class="of-node of-start-node flex items-center min-w-[180px] rounded-lg border-2 border-solid border-emerald-400 bg-white shadow-sm transition-all hover:shadow-md"
  >
    <!-- 输出 Handle（开始节点只有输出） -->
    <Handle
      type="source"
      position="right"
      id="source"
      class="!bg-emerald-400 !w-3 !h-3 !border-2 !border-white"
    />

    <div class="node-content flex items-center gap-3 p-3">
      <!-- 节点图标 -->
      <div
        class="node-icon flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
import type { OFStartNodeData } from '@preload/types'

defineProps<{
  data: OFStartNodeData
}>()
</script>

<style scoped>
.of-start-node {
  font-family: inherit;
}

.of-start-node:hover {
  border-color: #10b981;
}
</style>
