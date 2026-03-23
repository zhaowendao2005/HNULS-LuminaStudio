<template>
  <section
    class="nc-functioncall-message-block-a9k2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400">FunctionCall</p>
        <h5 class="mt-1 truncate text-[14px] font-semibold text-slate-900">
          {{ part.title }}
        </h5>
        <p class="mt-1 break-all text-[12px] text-slate-500">
          {{ part.functionCallName }}
        </p>
      </div>

      <span
        class="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
        :class="statusClass"
      >
        {{ statusLabel }}
      </span>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <div class="rounded-xl bg-white/80 p-3">
        <p class="text-[12px] font-medium text-slate-500">输入</p>
        <pre class="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-700">{{
          inputText
        }}</pre>
      </div>

      <div class="rounded-xl bg-white/80 p-3">
        <p class="text-[12px] font-medium text-slate-500">输出</p>
        <pre class="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-700">{{
          outputText
        }}</pre>
      </div>
    </div>

    <div
      v-if="part.errorMessage"
      class="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] leading-6 text-rose-700"
    >
      错误：{{ part.errorMessage }}
    </div>

    <p v-if="part.isStreaming || isPending" class="mt-3 text-[12px] text-slate-500">
      正在流式接收 functioncall 输出…
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NormalChatFunctionCallMessagePart } from '@preload/types'

const props = defineProps<{
  part: NormalChatFunctionCallMessagePart
  isPending?: boolean
}>()

const statusLabel = computed(() => {
  if (props.part.status === 'success') {
    return '已完成'
  }

  if (props.part.status === 'error') {
    return '已失败'
  }

  if (props.part.status === 'aborted') {
    return '已中止'
  }

  if (props.part.status === 'queued') {
    return '排队中'
  }

  return '执行中'
})

const statusClass = computed(() => {
  if (props.part.status === 'success') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (props.part.status === 'error') {
    return 'bg-rose-100 text-rose-700'
  }

  if (props.part.status === 'aborted') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-sky-100 text-sky-700'
})

const inputText = computed(() => props.part.input || '无')
const outputText = computed(() => {
  if (props.part.output) {
    return props.part.output
  }

  if (props.part.status === 'running') {
    return '等待输出…'
  }

  return '无'
})
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
