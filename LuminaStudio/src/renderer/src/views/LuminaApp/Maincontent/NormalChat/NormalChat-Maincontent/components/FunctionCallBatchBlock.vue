<template>
  <section
    class="nc-functioncall-batch-block-a9k2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400">FunctionCall Batch</p>
        <h5 class="mt-1 text-[14px] font-semibold text-slate-900">
          工具调用批次 {{ batchIndex + 1 }}
        </h5>
        <p class="mt-1 text-[12px] text-slate-500">
          共 {{ calls.length }} 个调用，{{ statusSummary }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <span
          class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
          :class="statusClass"
        >
          {{ statusLabel }}
        </span>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
          type="button"
          title="查看批次详情"
          @click="emit('view-detail')"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M4 5h16" />
            <path d="M4 12h10" />
            <path d="M4 19h16" />
            <path d="M17 9l3 3-3 3" />
          </svg>
        </button>
      </div>
    </div>

    <details class="mt-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
      <summary class="cursor-pointer text-[12px] font-medium text-slate-600">展开调用树</summary>
      <div class="mt-3 space-y-2">
        <div
          v-for="(call, index) in calls"
          :key="callKey(call, index)"
          class="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"
        >
          <div class="min-w-0">
            <p class="truncate text-[13px] font-medium text-slate-800">
              {{ call.title }}
            </p>
            <p class="mt-0.5 truncate text-[12px] text-slate-400">
              {{ call.functionCallName }}
            </p>
          </div>
          <span
            class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
            :class="callStatusClass(call.status)"
          >
            {{ callStatusLabel(call.status) }}
          </span>
        </div>
      </div>
    </details>

    <p v-if="isPending" class="mt-2 text-[12px] text-slate-500">工具调用仍在更新中…</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NormalChatFunctionCallMessagePart } from '@preload/types'

const props = defineProps<{
  batchIndex: number
  calls: NormalChatFunctionCallMessagePart[]
  isPending?: boolean
}>()

const emit = defineEmits<{
  'view-detail': []
}>()

const statusLabel = computed(() => {
  if (props.calls.some((call) => call.status === 'error')) {
    return '有失败'
  }
  if (props.calls.some((call) => call.status === 'running' || call.status === 'queued')) {
    return '执行中'
  }
  if (props.calls.some((call) => call.status === 'aborted')) {
    return '已中止'
  }
  return '已完成'
})

const statusClass = computed(() => {
  if (props.calls.some((call) => call.status === 'error')) {
    return 'bg-rose-100 text-rose-700'
  }
  if (props.calls.some((call) => call.status === 'running' || call.status === 'queued')) {
    return 'bg-sky-100 text-sky-700'
  }
  if (props.calls.some((call) => call.status === 'aborted')) {
    return 'bg-amber-100 text-amber-700'
  }
  return 'bg-emerald-100 text-emerald-700'
})

const statusSummary = computed(() => {
  // 这里用简短的统计描述，避免在列表区塞太多信息。
  const successCount = props.calls.filter((call) => call.status === 'success').length
  const errorCount = props.calls.filter((call) => call.status === 'error').length
  const runningCount = props.calls.filter(
    (call) => call.status === 'running' || call.status === 'queued'
  ).length
  const abortedCount = props.calls.filter((call) => call.status === 'aborted').length

  const segments: string[] = []
  if (successCount > 0) {
    segments.push(`成功 ${successCount}`)
  }
  if (errorCount > 0) {
    segments.push(`失败 ${errorCount}`)
  }
  if (runningCount > 0) {
    segments.push(`执行中 ${runningCount}`)
  }
  if (abortedCount > 0) {
    segments.push(`中止 ${abortedCount}`)
  }

  return segments.join(' / ') || '暂无调用'
})

function callKey(part: NormalChatFunctionCallMessagePart, index: number): string {
  return `call-${part.callId}-${index}`
}

function callStatusLabel(status: NormalChatFunctionCallMessagePart['status']): string {
  if (status === 'success') {
    return '成功'
  }
  if (status === 'error') {
    return '失败'
  }
  if (status === 'aborted') {
    return '中止'
  }
  if (status === 'queued') {
    return '排队中'
  }
  return '执行中'
}

function callStatusClass(status: NormalChatFunctionCallMessagePart['status']): string {
  if (status === 'success') {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (status === 'error') {
    return 'bg-rose-100 text-rose-700'
  }
  if (status === 'aborted') {
    return 'bg-amber-100 text-amber-700'
  }
  if (status === 'queued') {
    return 'bg-slate-100 text-slate-600'
  }
  return 'bg-sky-100 text-sky-700'
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
