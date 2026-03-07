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

    <div
      class="rounded-lg border border-gray-200 bg-gray-50 p-3 cursor-pointer"
      @click="toggleResultPreview"
    >
      <div class="flex items-center justify-between">
        <div class="text-xs font-medium uppercase text-gray-500">真实输出</div>
        <div class="text-xs text-gray-400">共 {{ resultItems.length }} 项</div>
      </div>
      <pre class="mt-2 whitespace-pre-wrap break-all text-sm text-gray-700">{{ displayResultPreview }}</pre>
      <div
        v-if="shouldTruncateResultPreview"
        class="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
      >
        {{ expandedResultPreview ? '收起' : '展开' }}
      </div>
    </div>

    <div v-if="iterationRuns.length" class="mt-3 space-y-2">
      <div class="text-xs font-medium uppercase text-gray-500">子图轮次追踪</div>
      <div
        v-for="item in iterationRuns"
        :key="item.id"
        class="rounded-lg border border-gray-200 bg-white px-3 py-2"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-medium text-gray-700">
              第 {{ item.iterationIndex + 1 }} 轮
            </div>
            <div class="mt-1 text-xs text-gray-400">
              scope: {{ item.scopeLabel }}
            </div>
            <div v-if="item.parallelRunId" class="mt-1 text-xs text-gray-400">
              parallel_run_id: {{ item.parallelRunId }}
            </div>
          </div>
          <span class="rounded px-2 py-0.5 text-xs font-medium" :class="getStatusClass(item.status)">
            {{ getStatusText(item.status) }}
          </span>
        </div>

        <div class="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
          <span>trace 数: {{ item.traceCount }}</span>
          <span v-if="item.resultPreview">结果: {{ item.resultPreview }}</span>
        </div>
      </div>
    </div>

    <div v-if="tracing.error" class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <div class="text-xs font-medium uppercase text-red-600">错误</div>
      <div class="mt-1 text-sm text-red-700">{{ tracing.error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OFNodeTracing } from '@shared/Orchestraflow-types'
import { OFNodeRunningStatus } from '@shared/Orchestraflow-types'

const props = defineProps<{
  tracing: OFNodeTracing
  allTraces: OFNodeTracing[]
}>()

interface IterationRunSummary {
  id: string
  iterationIndex: number
  parallelRunId?: string
  scopeLabel: string
  status: OFNodeRunningStatus
  traceCount: number
  resultPreview: string
}

const resultItems = computed(() => {
  const raw = props.tracing.outputs?.result
  return Array.isArray(raw) ? raw : []
})
const expandedResultPreview = ref(false)

const resultPreview = computed(() => {
  try {
    return JSON.stringify(props.tracing.outputs?.result ?? [], null, 2)
  } catch {
    return String(props.tracing.outputs?.result ?? [])
  }
})
const shouldTruncateResultPreview = computed(() => resultPreview.value.length > 30)
const displayResultPreview = computed(() =>
  expandedResultPreview.value || !shouldTruncateResultPreview.value
    ? resultPreview.value
    : `${resultPreview.value.slice(0, 30)}...`
)

const iterationRuns = computed<IterationRunSummary[]>(() => {
  const grouped = new Map<string, OFNodeTracing[]>()

  props.allTraces
    .filter((trace) => trace.nodeId !== props.tracing.nodeId)
    .filter((trace) => (trace.scope_path || []).includes(props.tracing.nodeId))
    .filter((trace) => trace.execution_metadata?.in_iteration_id)
    .forEach((trace) => {
      const iterationIndex = trace.execution_metadata?.iteration_index ?? -1
      const key = [
        trace.execution_metadata?.in_iteration_id,
        iterationIndex,
        trace.execution_metadata?.parallel_run_id || 'serial'
      ].join('::')
      const current = grouped.get(key) || []
      current.push(trace)
      grouped.set(key, current)
    })

  return Array.from(grouped.entries())
    .map(([id, traces]) => {
      const sample = traces[0]
      const iterationIndex = sample.execution_metadata?.iteration_index ?? 0
      const parallelRunId = sample.execution_metadata?.parallel_run_id
      const scopeLabel = (sample.scope_path || []).join(' / ') || 'root'
      const resultValue =
        iterationIndex >= 0 && iterationIndex < resultItems.value.length
          ? resultItems.value[iterationIndex]
          : undefined

      return {
        id,
        iterationIndex,
        parallelRunId,
        scopeLabel,
        status: resolveIterationStatus(traces),
        traceCount: traces.length,
        resultPreview: formatInlineValue(resultValue)
      }
    })
    .sort((left, right) => left.iterationIndex - right.iterationIndex)
})

const statusText = computed(() => getStatusText(props.tracing.status))
const statusClass = computed(() => getStatusClass(props.tracing.status))

function resolveIterationStatus(traces: OFNodeTracing[]): OFNodeRunningStatus {
  if (traces.some((trace) => trace.status === OFNodeRunningStatus.Failed)) {
    return OFNodeRunningStatus.Failed
  }
  if (traces.some((trace) => trace.status === OFNodeRunningStatus.Running)) {
    return OFNodeRunningStatus.Running
  }
  if (traces.some((trace) => trace.status === OFNodeRunningStatus.Succeeded)) {
    return OFNodeRunningStatus.Succeeded
  }
  if (traces.every((trace) => trace.status === OFNodeRunningStatus.Skipped)) {
    return OFNodeRunningStatus.Skipped
  }
  return OFNodeRunningStatus.NotStarted
}

function formatInlineValue(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function getStatusText(status: OFNodeRunningStatus) {
  switch (status) {
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
}

function getStatusClass(status: OFNodeRunningStatus) {
  switch (status) {
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
}

function toggleResultPreview() {
  if (!shouldTruncateResultPreview.value) return
  expandedResultPreview.value = !expandedResultPreview.value
}
</script>
