<template>
  <div class="of-node-output rounded-xl transition-shadow" :class="haloClass">
    <div class="mb-3 flex items-center gap-2">
      <div class="flex h-5 w-5 items-center justify-center rounded bg-cyan-500 text-white">
        <svg viewBox="0 0 24 24" class="h-3 w-3" fill="currentColor">
          <path
            d="M14 5h5v5h-2V8.414l-4.293 4.293L17 17v-1.5h2V20h-5v-2h1.586l-4-4H3v-2h8.586l4.293-4.293H14V5Z"
          />
        </svg>
      </div>
      <div class="system-md-semibold text-gray-900">条件分支</div>
      <div v-if="tracing.status" class="ml-auto">
        <span
          class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
          :class="statusClass"
        >
          {{ statusText }}
        </span>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div class="text-xs font-medium uppercase text-gray-500">命中分支</div>
      <div class="mt-1 text-sm text-gray-700">
        {{ tracing.outputs?.matchedLabel || tracing.outputs?.matchedHandleId || '(无)' }}
      </div>
    </div>

    <div v-if="caseEvaluations.length" class="mt-3 space-y-2">
      <div class="text-xs font-medium uppercase text-gray-500">条件结果</div>
      <div
        v-for="item in caseEvaluations"
        :key="item.caseId"
        class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
      >
        <span class="text-gray-700">{{ item.label }}</span>
        <span :class="item.passed ? 'text-emerald-600' : 'text-gray-400'">
          {{ item.passed ? '命中' : '未命中' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OFNodeTracing } from '@shared/Orchestraflow-types'
import { OFNodeRunningStatus } from '@shared/Orchestraflow-types'

const props = defineProps<{
  tracing: OFNodeTracing
}>()

const statusText = computed(() => {
  switch (props.tracing.status) {
    case OFNodeRunningStatus.Succeeded:
      return '成功'
    case OFNodeRunningStatus.Failed:
      return '失败'
    case OFNodeRunningStatus.Running:
      return '运行中'
    case OFNodeRunningStatus.Skipped:
      return '跳过'
    default:
      return '未开始'
  }
})

const statusClass = computed(() => {
  switch (props.tracing.status) {
    case OFNodeRunningStatus.Succeeded:
      return 'bg-green-100 text-green-700'
    case OFNodeRunningStatus.Failed:
      return 'bg-red-100 text-red-700'
    case OFNodeRunningStatus.Running:
      return 'bg-blue-100 text-blue-700'
    case OFNodeRunningStatus.Skipped:
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
})
const haloClass = computed(() =>
  props.tracing.status === OFNodeRunningStatus.Running
    ? 'ring-2 ring-cyan-400/70 shadow-[0_0_0_6px_rgba(34,211,238,0.12)]'
    : ''
)

const caseEvaluations = computed(
  () =>
    (props.tracing.outputs?.caseEvaluations as
      | Array<{ caseId: string; label: string; passed: boolean }>
      | undefined) || []
)
</script>
