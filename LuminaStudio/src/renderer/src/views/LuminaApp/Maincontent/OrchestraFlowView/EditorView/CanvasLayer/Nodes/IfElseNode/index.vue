<template>
  <div
    class="group relative w-[240px] rounded-[15px] border bg-[#f3f4f6] pb-1 shadow-sm transition-all hover:shadow-lg"
    :class="containerClass"
  >
    <Handle
      type="target"
      :position="Position.Left"
      id="target"
      class="of-ifelse-target-handle !-left-[9px] !top-4 !z-30 !h-4 !w-4 !translate-y-0 !rounded-none !border-none !bg-transparent !outline-none"
    />

    <div class="px-4 pt-3 text-xs font-medium tracking-wide text-gray-500">条件分支</div>

    <div class="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
      <div class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-white shadow-sm">
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
          <path d="M14 5h5v5h-2V8.414l-4.293 4.293L17 17v-1.5h2V20h-5v-2h1.586l-4-4H3v-2h8.586l4.293-4.293H14V5Z" />
        </svg>
      </div>
      <div class="mr-1 min-w-0 flex grow items-center truncate text-base font-semibold text-gray-900">
        {{ data.title || '条件分支' }}
      </div>
      <div v-if="runningStatus === OFNodeRunningStatus.Succeeded" class="of-node-status-success">✓</div>
      <div v-else-if="runningStatus === OFNodeRunningStatus.Running" class="of-node-status-running"></div>
      <div v-else-if="runningStatus === OFNodeRunningStatus.Failed" class="of-node-status-failed">✕</div>
      <div v-else-if="runningStatus === OFNodeRunningStatus.Skipped" class="of-node-status-skipped">-</div>
    </div>

    <div class="space-y-1 px-3 pb-2">
      <div
        v-for="(item, index) in caseRows"
        :key="item.id"
        class="relative rounded-xl bg-[#e9eaee] px-2 py-1.5"
      >
        <div class="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase text-gray-600">
          <span>{{ item.label }}</span>
          <span v-if="index === 0" class="text-gray-400">命中即停止</span>
        </div>
        <div class="space-y-1">
          <div
            v-for="condition in item.preview"
            :key="condition"
            class="truncate rounded-md bg-white/70 px-2 py-1 text-xs text-gray-600"
          >
            {{ condition }}
          </div>
        </div>
        <Handle
          type="source"
          :position="Position.Right"
          :id="item.handleId"
          class="of-ifelse-source-handle !-right-[21px] !top-1/2 !z-30 !h-4 !w-4 !-translate-y-1/2 !rounded-none !border-none !bg-transparent !outline-none"
        />
      </div>

      <div class="relative rounded-xl bg-[#e9eaee] px-2 py-1.5">
        <div class="text-right text-[11px] font-semibold uppercase text-gray-600">ELSE</div>
        <div class="mt-1 rounded-md bg-white/70 px-2 py-1 text-xs text-gray-500">其余情况</div>
        <Handle
          type="source"
          :position="Position.Right"
          :id="data.elseCase.handleId"
          class="of-ifelse-source-handle !-right-[21px] !top-1/2 !z-30 !h-4 !w-4 !-translate-y-1/2 !rounded-none !border-none !bg-transparent !outline-none"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import {
  OFNodeRunningStatus,
  type OFIfElseCondition,
  type OFIfElseNodeData
} from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFIfElseNodeData
}>()

function summarizeCondition(condition: OFIfElseCondition): string {
  const left = condition.variable_label || condition.variable_path || '未设置变量'
  if (condition.operator === 'is_empty' || condition.operator === 'is_not_empty') {
    return `${left} ${condition.operator}`
  }
  return `${left} ${condition.operator} ${String(condition.value ?? '未设置')}`
}

const caseRows = computed(() =>
  (props.data.cases || []).map((item) => ({
    id: item.id,
    label: item.label,
    handleId: item.handleId,
    preview:
      item.conditions.length > 0
        ? item.conditions.slice(0, 2).map(summarizeCondition)
        : ['条件未设置']
  }))
)

const runningStatus = computed(() => props.data?._runningStatus || OFNodeRunningStatus.NotStarted)
const containerClass = computed(() => {
  if (runningStatus.value === OFNodeRunningStatus.Running) return 'border-indigo-400 of-node-running'
  if (runningStatus.value === OFNodeRunningStatus.Succeeded) return 'border-emerald-500'
  if (runningStatus.value === OFNodeRunningStatus.Failed) return 'border-red-400'
  if (runningStatus.value === OFNodeRunningStatus.Skipped) return 'border-gray-300'
  return 'border-transparent'
})
</script>

<style scoped>
.of-node-running {
  animation: ofNodePulse 1.3s ease-in-out infinite;
}

.of-node-status-success,
.of-node-status-running,
.of-node-status-failed,
.of-node-status-skipped {
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
}

.of-node-status-failed {
  background: #dc2626;
}

.of-node-status-skipped {
  background: #94a3b8;
}

.of-ifelse-target-handle::after,
.of-ifelse-source-handle::after {
  content: '';
  position: absolute;
  top: 4px;
  width: 2px;
  height: 8px;
  background: #06b6d4;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.of-ifelse-target-handle::after {
  left: 7px;
}

.of-ifelse-source-handle::after {
  right: 7px;
}

.group:hover .of-ifelse-target-handle::after,
.group:hover .of-ifelse-source-handle::after {
  opacity: 1;
}

.of-ifelse-target-handle:hover::after,
.of-ifelse-source-handle:hover::after {
  transform: scaleY(1.15);
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
</style>
