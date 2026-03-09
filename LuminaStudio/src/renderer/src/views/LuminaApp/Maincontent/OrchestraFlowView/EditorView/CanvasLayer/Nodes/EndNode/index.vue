<template>
  <div
    class="of-node of-end-node group relative w-[240px] rounded-[15px] border bg-[#f3f4f6] pb-1 shadow-sm transition-all hover:shadow-lg"
    :class="containerClass"
  >
    <div class="px-4 pt-3 text-xs font-medium tracking-wide text-gray-500">结束</div>

    <Handle
      id="target"
      type="target"
      :position="Position.Left"
      class="of-node-handle of-handle-target of-end-target-handle"
    />

    <div class="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
      <div
        class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f59f00] text-white shadow-sm"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <div
        class="mr-1 min-w-0 flex grow items-center truncate text-base font-semibold text-gray-900"
      >
        {{ data.title || '输出' }}
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
      <div v-if="outputVariables.length" class="space-y-0.5">
        <div
          v-for="(item, index) in outputVariables"
          :key="`${item.variable || item.label || 'output'}-${index}`"
          class="flex h-6 items-center justify-between space-x-1 rounded-md bg-[#e9eaee] px-1"
        >
          <div class="flex w-0 grow items-center space-x-1">
            <span class="text-sm font-semibold text-[#4c6ef5]">{x}</span>
            <span class="w-0 grow truncate text-xs text-gray-700">
              {{ item.label || item.variable }}
            </span>
          </div>
          <div class="ml-1 flex items-center space-x-1">
            <span class="text-[10px] uppercase tracking-wide text-gray-500">
              {{ item.type || 'string' }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="rounded-md bg-[#e9eaee] px-2 py-1 text-xs text-gray-600">输出：未配置</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { OFNodeRunningStatus, type OFEndNodeData } from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFEndNodeData
}>()

const outputVariables = computed(() => {
  const variables = props.data?.output?.variables || (props.data as any)?.outputs || []
  return variables.slice(0, 3)
})

const runningStatus = computed(() => props.data?._runningStatus || OFNodeRunningStatus.NotStarted)
const containerClass = computed(() => {
  if (runningStatus.value === OFNodeRunningStatus.Running)
    return 'border-indigo-400 of-node-running'
  if (runningStatus.value === OFNodeRunningStatus.Succeeded) return 'border-emerald-500'
  if (runningStatus.value === OFNodeRunningStatus.Failed) return 'border-red-400'
  return 'border-transparent'
})
</script>

<style scoped>
.of-end-node {
  font-family: inherit;
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

/* 指示器颜色（定位/尺寸/hover 由 CanvasLayer 统一管理） */
.of-end-target-handle::after {
  background: #f59f00;
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
