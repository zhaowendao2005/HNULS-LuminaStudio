<template>
  <div class="of-node of-llm-node group relative w-[240px] rounded-[15px] border border-transparent bg-[#f3f4f6] pb-1 shadow-sm transition-all hover:shadow-lg">
    <div class="px-4 pt-3 text-xs font-medium tracking-wide text-gray-500">LLM</div>

    <Handle
      type="target"
      position="left"
      id="target"
      class="of-llm-target-handle !top-4 !-left-[9px] !h-4 !w-4 !translate-y-0 !rounded-none !border-none !bg-transparent !outline-none"
    />
    <Handle
      type="source"
      position="right"
      id="source"
      class="of-llm-source-handle !top-4 !-right-[9px] !h-4 !w-4 !translate-y-0 !rounded-none !border-none !bg-transparent !outline-none"
    />

    <div class="of-node-actions absolute -top-7 right-0 hidden h-7 pb-1 group-hover:flex">
      <div class="flex h-6 items-center rounded-lg border border-gray-200 bg-white px-1 text-gray-500 shadow-sm">
        <div class="flex h-5 w-5 items-center justify-center rounded-md hover:bg-gray-100">
          <svg viewBox="0 0 24 24" class="h-3 w-3" fill="currentColor">
            <path d="M8 18.3915V5.60846L18.2264 12L8 18.3915ZM6 3.80421V20.1957C6 20.9812 6.86395 21.46 7.53 21.0437L20.6432 12.848C21.2699 12.4563 21.2699 11.5436 20.6432 11.152L7.53 2.95621C6.86395 2.53993 6 3.01878 6 3.80421Z" />
          </svg>
        </div>
        <div class="flex h-5 w-5 items-center justify-center rounded-md hover:bg-gray-100">
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
            <path d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z" />
          </svg>
        </div>
      </div>
    </div>

    <div class="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
      <div class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#6c63ff] text-white shadow-sm">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div class="mr-1 flex grow items-center truncate text-base font-semibold text-gray-900">
        {{ data.title || 'LLM' }}
      </div>
      <div class="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
        ✓
      </div>
    </div>

    <div class="mb-1 px-3 py-1">
      <div class="flex h-8 items-center justify-between rounded-md bg-[#e9eaee] px-2 text-xs text-gray-700">
        <div class="truncate">
          {{ modelSummary }}
        </div>
        <span class="ml-2 rounded border border-gray-300 px-1.5 py-0.5 text-[10px] uppercase text-gray-500">CHAT</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle } from '@vue-flow/core'
import type { OFLLMNodeData } from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFLLMNodeData
}>()

const modelSummary = computed(() => {
  const provider = props.data?.model?.provider || '未选择 Provider'
  const model = props.data?.model?.name || '未选择模型'
  return `${provider}/${model}`
})
</script>

<style scoped>
.of-llm-node {
  font-family: inherit;
}

.of-llm-target-handle::after,
.of-llm-source-handle::after {
  content: '';
  position: absolute;
  top: 4px;
  width: 2px;
  height: 8px;
  background: #6c63ff;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.of-llm-target-handle::after {
  left: 6px;
}

.of-llm-source-handle::after {
  right: 6px;
}

.of-llm-node:hover .of-llm-target-handle::after,
.of-llm-node:hover .of-llm-source-handle::after {
  opacity: 1;
}
</style>
