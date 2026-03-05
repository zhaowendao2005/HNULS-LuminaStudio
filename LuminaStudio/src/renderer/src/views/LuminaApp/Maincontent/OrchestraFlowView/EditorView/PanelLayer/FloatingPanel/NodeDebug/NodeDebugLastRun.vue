<template>
  <div class="space-y-3">
    <div v-if="loading" class="py-10 text-center">
      <div class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      <div class="mt-3 text-sm text-gray-400">运行中...</div>
    </div>

    <div v-else-if="!result" class="py-6 text-center text-sm text-gray-400">暂无运行记录</div>

    <template v-else>
      <div class="rounded-lg border px-3 py-2" :class="statusClass">
        <div class="text-sm font-semibold">{{ statusText }}</div>
        <div class="text-xs opacity-80">耗时 {{ result.elapsed_time || 0 }}ms</div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <div class="mb-1 text-xs uppercase text-gray-500">输入</div>
        <pre class="text-xs text-gray-700 whitespace-pre-wrap break-all">{{ pretty(result.inputs) }}</pre>
      </div>

      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <div class="mb-1 text-xs uppercase text-gray-500">输出</div>
        <pre class="text-xs text-gray-700 whitespace-pre-wrap break-all">{{ pretty(result.outputs) }}</pre>
      </div>

      <div v-if="result.error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
        {{ result.error }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OFNodeDebugResult } from '@shared/Orchestraflow-types'
import { OFNodeRunningStatus } from '@shared/Orchestraflow-types'

const props = defineProps<{
  result?: OFNodeDebugResult
  loading?: boolean
}>()

const statusText = computed(() => {
  if (!props.result) return '未运行'
  if (props.result.status === OFNodeRunningStatus.Succeeded) return '运行成功'
  if (props.result.status === OFNodeRunningStatus.Failed) return '运行失败'
  return props.result.status
})

const statusClass = computed(() => {
  if (!props.result) return 'border-gray-200 bg-gray-50 text-gray-700'
  return props.result.status === OFNodeRunningStatus.Succeeded
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700'
})

function pretty(value: unknown): string {
  if (value === undefined) return '(空)'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
</script>
