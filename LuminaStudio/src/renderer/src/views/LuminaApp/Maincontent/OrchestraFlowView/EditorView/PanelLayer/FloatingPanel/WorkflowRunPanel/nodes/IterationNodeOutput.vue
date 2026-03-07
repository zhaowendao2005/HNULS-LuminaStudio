<template>
  <div class="of-iteration-node-output">
    <div class="mb-3 flex items-center gap-2">
      <div class="flex h-5 w-5 items-center justify-center rounded bg-cyan-500 text-white">
        <svg
          viewBox="0 0 24 24"
          class="h-3 w-3"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
        >
          <path
            d="M20 11A8 8 0 1 0 6.062 16.938M20 11V4m0 7h-7M4 13a8 8 0 0 0 13.938 5.938M4 13v7m0-7h7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="system-md-semibold text-gray-900">迭代</div>
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
      <div class="text-xs font-medium uppercase text-gray-500">聚合摘要</div>
      <div class="mt-1 text-sm text-gray-700">{{ tracing.outputs?.summary || '(无)' }}</div>
    </div>

    <div v-if="iterations.length" class="mt-3 space-y-2">
      <div class="text-xs font-medium uppercase text-gray-500">迭代轮次</div>
      <div
        v-for="item in iterations"
        :key="item.index"
        class="rounded-lg border border-gray-200 bg-white px-3 py-2"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-700">{{ item.title }}</span>
          <span class="text-xs text-cyan-600">第 {{ item.index }} 轮</span>
        </div>
        <div class="mt-1 text-xs text-gray-500">{{ item.outputSummary }}</div>
      </div>
    </div>

    <div class="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
      <div class="text-xs font-medium uppercase text-cyan-700">最终输出</div>
      <div class="mt-1 text-sm text-cyan-900">{{ tracing.outputs?.finalOutput || '(无)' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OFIterationResultItem, OFNodeTracing } from '@shared/Orchestraflow-types'
import { OFNodeRunningStatus } from '@shared/Orchestraflow-types'

const props = defineProps<{
  tracing: OFNodeTracing
}>()

const iterations = computed<OFIterationResultItem[]>(() =>
  Array.isArray(props.tracing.outputs?.iterations) ? props.tracing.outputs.iterations : []
)

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
</script>
