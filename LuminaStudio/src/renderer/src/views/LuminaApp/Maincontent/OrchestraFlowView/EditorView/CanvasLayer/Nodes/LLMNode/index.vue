<template>
  <div
    class="of-node of-llm-node flex items-center min-w-[200px] rounded-lg border-2 border-solid border-violet-400 bg-white shadow-sm transition-all hover:shadow-md"
  >
    <!-- 输入 Handle -->
    <Handle
      type="target"
      position="left"
      id="target"
      class="!bg-violet-400 !w-3 !h-3 !border-2 !border-white"
    />

    <div class="node-content flex flex-col gap-2 p-3">
      <!-- 节点标题栏 -->
      <div class="node-header flex items-center gap-3">
        <!-- 节点图标 -->
        <div
          class="node-icon flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <!-- 节点信息 -->
        <div class="node-info flex-1">
          <div class="node-title font-medium text-gray-900">{{ data.title }}</div>
          <div class="node-desc text-sm text-gray-500">{{ data.desc }}</div>
        </div>
      </div>

      <!-- 模型信息展示（简化版） -->
      <div
        v-if="data.model"
        class="node-model flex items-center gap-2 rounded bg-gray-50 px-2 py-1.5 text-xs text-gray-600"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span class="font-medium">{{ data.model.provider }}</span>
        <span class="text-gray-400">/</span>
        <span>{{ data.model.name }}</span>
      </div>
    </div>

    <!-- 输出 Handle -->
    <Handle
      type="source"
      position="right"
      id="source"
      class="!bg-violet-400 !w-3 !h-3 !border-2 !border-white"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle } from '@vue-flow/core'
import type { OFLLMNodeData } from '@preload/types'

defineProps<{
  data: OFLLMNodeData
}>()
</script>

<style scoped>
.of-llm-node {
  font-family: inherit;
}

.of-llm-node:hover {
  border-color: #8b5cf6;
}
</style>
