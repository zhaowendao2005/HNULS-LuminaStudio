<template>
  <div
    v-if="isNested"
    class="of-node of-llm-node of-llm-node-nested group relative rounded-[20px] border border-[#edf0f4] bg-[#fbfbfc] shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
    :class="nestedContainerClass"
    style="--of-handle-top: 28px"
  >
    <Handle
      type="target"
      :position="Position.Left"
      id="target"
      class="of-node-handle of-handle-target of-llm-target-handle"
    />
    <Handle
      type="source"
      :position="Position.Right"
      id="source"
      class="of-node-handle of-handle-source of-llm-source-handle"
    />

    <div class="flex items-center gap-3 px-4 pb-3 pt-4">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6c72f7] text-white">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div class="truncate text-[18px] font-semibold text-[#111827]">
        {{ data.title || 'LLM 2' }}
      </div>
    </div>

    <div class="px-4 pb-4">
      <div
        class="flex h-11 items-center justify-between rounded-xl border border-[#edf0f4] bg-[#f4f5f7] px-3 text-sm text-[#111827]"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span class="text-[#6c63ff]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          <span class="truncate text-[15px]">{{ nestedModelSummary }}</span>
        </div>
        <span
          class="ml-2 rounded-[10px] border border-[#d6d9df] bg-[#eef0f4] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6b7280]"
        >
          CHAT
        </span>
      </div>
    </div>
  </div>

  <div
    v-else
    class="of-node of-llm-node group relative w-[240px] rounded-[15px] border bg-[#f3f4f6] pb-1 shadow-sm transition-all hover:shadow-lg"
    :class="containerClass"
  >
    <div class="px-4 pt-3 text-xs font-medium tracking-wide text-gray-500">LLM</div>

    <Handle
      type="target"
      :position="Position.Left"
      id="target"
      class="of-node-handle of-handle-target of-llm-target-handle"
    />
    <Handle
      type="source"
      :position="Position.Right"
      id="source"
      class="of-node-handle of-handle-source of-llm-source-handle"
    />

    <div class="of-node-actions absolute -top-7 right-0 hidden h-7 pb-1 group-hover:flex">
      <div
        class="flex h-6 items-center rounded-lg border border-gray-200 bg-white px-1 text-gray-500 shadow-sm"
      >
        <div class="flex h-5 w-5 items-center justify-center rounded-md hover:bg-gray-100">
          <svg viewBox="0 0 24 24" class="h-3 w-3" fill="currentColor">
            <path
              d="M8 18.3915V5.60846L18.2264 12L8 18.3915ZM6 3.80421V20.1957C6 20.9812 6.86395 21.46 7.53 21.0437L20.6432 12.848C21.2699 12.4563 21.2699 11.5436 20.6432 11.152L7.53 2.95621C6.86395 2.53993 6 3.01878 6 3.80421Z"
            />
          </svg>
        </div>
        <div class="flex h-5 w-5 items-center justify-center rounded-md hover:bg-gray-100">
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
            <path
              d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
            />
          </svg>
        </div>
      </div>
    </div>

    <div class="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
      <div
        class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#6c63ff] text-white shadow-sm"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div
        class="mr-1 min-w-0 flex grow items-center truncate text-base font-semibold text-gray-900"
      >
        {{ data.title || 'LLM' }}
      </div>
      <div v-if="runningStatus === OFNodeRunningStatus.Succeeded" class="of-node-status-success">
        ✓
      </div>
      <div
        v-else-if="runningStatus === OFNodeRunningStatus.Running"
        class="of-node-status-running"
      ></div>
      <div v-else-if="runningStatus === OFNodeRunningStatus.Failed" class="of-node-status-failed">
        ✕
      </div>
    </div>

    <div class="mb-1 px-3 py-1">
      <div
        class="flex h-8 items-center justify-between rounded-md bg-[#e9eaee] px-2 text-xs text-gray-700"
      >
        <div class="truncate">
          {{ modelSummary }}
        </div>
        <div class="ml-2 flex items-center gap-1">
          <span
            v-if="data.structured_output?.enabled"
            class="rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[10px] uppercase text-cyan-600"
          >
            JSON
          </span>
          <span
            class="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] uppercase text-gray-500"
          >
            CHAT
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { OFNodeRunningStatus, type OFLLMNodeData } from '@shared/Orchestraflow-types'
import { useModelConfigStore } from '@renderer/stores/model-config/store'

const props = defineProps<{
  data: OFLLMNodeData
  parentNode?: string
}>()
const modelConfigStore = useModelConfigStore()

const isNested = computed(() => Boolean(props.parentNode))

const modelSummary = computed(() => {
  const providerId = props.data?.model?.provider || ''
  const providerName =
    modelConfigStore.providers.find((item) => item.id === providerId)?.name || providerId
  const provider = providerName || '未选择 Provider'
  const model = props.data?.model?.name || '未选择模型'
  return `${provider}/${model}`
})

const nestedModelSummary = computed(() => {
  const summary = modelSummary.value
  if (summary.length <= 18) return summary
  return `${summary.slice(0, 18)}...`
})

const runningStatus = computed(() => props.data?._runningStatus || OFNodeRunningStatus.NotStarted)
const containerClass = computed(() => {
  if (runningStatus.value === OFNodeRunningStatus.Running)
    return 'border-indigo-400 of-node-running'
  if (runningStatus.value === OFNodeRunningStatus.Succeeded) return 'border-emerald-500'
  if (runningStatus.value === OFNodeRunningStatus.Failed) return 'border-red-400'
  return 'border-transparent'
})

const nestedContainerClass = computed(() => {
  if (runningStatus.value === OFNodeRunningStatus.Running)
    return 'border-indigo-300 shadow-[0_0_0_4px_rgba(108,99,255,0.08)]'
  if (runningStatus.value === OFNodeRunningStatus.Succeeded) return 'border-emerald-400'
  if (runningStatus.value === OFNodeRunningStatus.Failed) return 'border-red-300'
  return ''
})
</script>

<style scoped>
.of-llm-node {
  font-family: inherit;
}

.of-llm-node-nested {
  width: 312px;
}

.of-node-running {
  animation: ofNodePulse 1.3s ease-in-out infinite;
}

.of-node-status-success,
.of-node-status-running,
.of-node-status-failed {
  height: 20px;
  width: 20px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
}

.of-node-status-success {
  background: #059669;
}

.of-node-status-running {
  background: #4f46e5;
  position: relative;
}

.of-node-status-running::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 9999px;
  border: 2px solid rgba(79, 70, 229, 0.35);
  animation: ofStatusPulse 1.2s ease-out infinite;
}

.of-node-status-failed {
  background: #dc2626;
}

.of-llm-target-handle::after,
.of-llm-source-handle::after {
  background: #6c63ff;
}

@keyframes ofNodePulse {
  0%,
  100% {
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.05),
      0 0 0 0 rgba(79, 70, 229, 0.18);
  }
  50% {
    box-shadow:
      0 8px 18px rgba(0, 0, 0, 0.08),
      0 0 0 6px rgba(79, 70, 229, 0.08);
  }
}

@keyframes ofStatusPulse {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.18);
  }
}
</style>
