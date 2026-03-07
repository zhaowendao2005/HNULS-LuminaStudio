<template>
  <div
    class="of-node group relative w-[248px] rounded-[15px] border bg-[#f3f4f6] pb-1 shadow-sm transition-all hover:shadow-lg"
    :class="containerClass"
  >
    <Handle
      id="target"
      type="target"
      :position="Position.Left"
      class="of-node-handle of-handle-target of-variable-assign-target-handle"
    />
    <Handle
      id="source"
      type="source"
      :position="Position.Right"
      class="of-node-handle of-handle-source of-variable-assign-source-handle"
    />

    <div class="px-4 pt-3 text-xs font-medium tracking-wide text-gray-500">VARIABLE</div>

    <div class="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
      <div
        class="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7 7H17M7 12H13M7 17H11M16 12L18 14L22 10"
          />
        </svg>
      </div>
      <div class="mr-1 min-w-0 flex grow items-center truncate text-base font-semibold text-gray-900">
        {{ data.title || '变量赋值' }}
      </div>
      <div v-if="runningStatus === OFNodeRunningStatus.Succeeded" class="of-node-status-success">✓</div>
      <div
        v-else-if="runningStatus === OFNodeRunningStatus.Running"
        class="of-node-status-running"
      ></div>
      <div v-else-if="runningStatus === OFNodeRunningStatus.Failed" class="of-node-status-failed">!</div>
    </div>

    <div class="space-y-1 px-3 pb-2">
      <div class="rounded-xl bg-[#e9eaee] px-2 py-2">
        <div class="flex items-center justify-between text-[11px] font-semibold text-gray-500">
          <span>规则数</span>
          <span>{{ ruleCount }}</span>
        </div>
        <div class="mt-2 space-y-1">
          <div
            v-for="item in previewRules"
            :key="item.id"
            class="truncate rounded-md bg-white/70 px-2 py-1 text-xs text-gray-600"
            :title="item.text"
          >
            {{ item.text }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import {
  OFNodeRunningStatus,
  type OFVariableAssignNodeData
} from '@shared/Orchestraflow-types'

const props = defineProps<{
  data: OFVariableAssignNodeData
}>()

const ruleCount = computed(() => props.data.rules?.length || 0)
const previewRules = computed(() =>
  (props.data.rules || []).slice(0, 2).map((rule) => ({
    id: rule.id,
    text: `${rule.target_variable || '未命名'} ← ${rule.source_path || (rule.source_mode === 'constant' ? '常量' : '未选择')}`
  }))
)

const runningStatus = computed(() => props.data?._runningStatus || OFNodeRunningStatus.NotStarted)
const containerClass = computed(() => {
  if (runningStatus.value === OFNodeRunningStatus.Running) return 'border-indigo-400 of-node-running'
  if (runningStatus.value === OFNodeRunningStatus.Succeeded) return 'border-emerald-500'
  if (runningStatus.value === OFNodeRunningStatus.Failed) return 'border-red-400'
  return 'border-transparent'
})
</script>

<style scoped>
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
}

.of-node-status-failed {
  background: #dc2626;
}

.of-variable-assign-target-handle::after,
.of-variable-assign-source-handle::after {
  background: #0ea5e9;
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
