<template>
  <div class="of-node of-start-node group relative w-[240px] rounded-[15px] border border-transparent bg-[#f3f4f6] pb-1 shadow-sm transition-all hover:shadow-lg">
    <div class="px-4 pt-3 text-xs font-medium tracking-wide text-gray-500">开始</div>

    <Handle
      type="source"
      position="right"
      id="source"
      class="of-start-source-handle !top-4 !-right-[9px] !h-4 !w-4 !translate-y-0 !rounded-none !border-none !bg-transparent !outline-none"
    />

    <div
      class="of-start-handle-add pointer-events-none absolute right-[-10px] top-4 z-20 hidden h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white group-hover:flex"
    >
      <svg viewBox="0 0 24 24" class="h-2.5 w-2.5" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </div>

    <div class="of-start-header flex items-center rounded-t-2xl px-3 pb-2 pt-3">
      <div class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#4c6ef5] text-white shadow-sm">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V11z"
          />
        </svg>
      </div>
      <div class="mr-1 flex grow items-center truncate text-base font-semibold text-gray-900">
        {{ data.title || '用户输入' }}
      </div>
    </div>

    <div class="mb-1 px-3 py-1">
      <div v-if="inputVariables.length" class="space-y-0.5">
        <div
          v-for="(item, index) in inputVariables"
          :key="`${item.variable || item.label || 'field'}-${index}`"
          class="flex h-6 items-center justify-between space-x-1 rounded-md bg-[#e9eaee] px-1"
        >
          <div class="flex w-0 grow items-center space-x-1">
            <span class="text-sm font-semibold text-[#4c6ef5]">{x}</span>
            <span class="w-0 grow truncate text-xs text-gray-700">{{ item.label || item.variable }}</span>
          </div>
          <div class="ml-1 flex items-center space-x-1">
            <span v-if="item.required" class="text-[10px] uppercase tracking-wide text-gray-500">必填</span>
            <span class="text-[10px] uppercase tracking-wide text-gray-500">{{ item.type || 'string' }}</span>
          </div>
        </div>
      </div>
      <div v-else class="rounded-md bg-[#e9eaee] px-2 py-1 text-xs text-gray-600">输入：未配置</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle } from '@vue-flow/core'
import type { OFStartNodeData } from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFStartNodeData
}>()

const inputVariables = computed(() => {
  const variables = props.data?.input?.variables || (props.data as any)?.inputs || []
  return variables.slice(0, 3)
})
</script>

<style scoped>
.of-start-node {
  font-family: inherit;
}

.of-start-source-handle::after {
  content: '';
  position: absolute;
  right: 6px;
  top: 4px;
  width: 2px;
  height: 8px;
  background: #4c6ef5;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.of-start-node:hover .of-start-source-handle::after {
  opacity: 1;
}
</style>

