<template>
  <div class="of-node of-end-node group relative w-[240px] rounded-[15px] border border-transparent bg-[#f3f4f6] pb-1 shadow-sm transition-all hover:shadow-lg">
    <div class="px-4 pt-3 text-xs font-medium tracking-wide text-gray-500">结束</div>

    <Handle
      type="target"
      position="left"
      id="target"
      class="of-end-target-handle !top-4 !-left-[9px] !h-4 !w-4 !translate-y-0 !rounded-none !border-none !bg-transparent !outline-none"
    />

    <div class="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
      <div class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f59f00] text-white shadow-sm">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="mr-1 flex grow items-center truncate text-base font-semibold text-gray-900">
        {{ data.title || '输出' }}
      </div>
      <div class="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
        ✓
      </div>
    </div>

    <div class="mb-1 px-3 py-1">
      <div v-if="outputVariables.length" class="space-y-0.5">
        <div
          v-for="(item, index) in outputVariables"
          :key="`${item.variable || item.label || 'output'}-${index}`"
          class="flex h-6 items-center justify-between space-x-1 rounded-md bg-[#e9eaee] px-1"
        >
          <div class="flex w-0 grow items-center space-x-1">
            <span class="text-sm font-semibold text-[#4c6ef5]">{x}</span>
            <span class="w-0 grow truncate text-xs text-gray-700">{{ item.label || item.variable }}</span>
          </div>
          <div class="ml-1 flex items-center space-x-1">
            <span class="text-[10px] uppercase tracking-wide text-gray-500">{{ item.type || 'string' }}</span>
          </div>
        </div>
      </div>
      <div v-else class="rounded-md bg-[#e9eaee] px-2 py-1 text-xs text-gray-600">输出：未配置</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle } from '@vue-flow/core'
import type { OFEndNodeData } from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFEndNodeData
}>()

const outputVariables = computed(() => {
  const variables = props.data?.output?.variables || (props.data as any)?.outputs || []
  return variables.slice(0, 3)
})
</script>

<style scoped>
.of-end-node {
  font-family: inherit;
}

.of-end-target-handle::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 4px;
  width: 2px;
  height: 8px;
  background: #f59f00;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.of-end-node:hover .of-end-target-handle::after {
  opacity: 1;
}
</style>
