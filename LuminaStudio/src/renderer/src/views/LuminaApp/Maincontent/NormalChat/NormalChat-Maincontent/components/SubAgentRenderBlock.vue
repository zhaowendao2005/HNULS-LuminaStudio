<template>
  <section class="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] uppercase tracking-[0.18em] text-sky-600">Sub Agent</p>
        <h5 class="mt-1 text-[14px] font-semibold text-slate-900">已创建子代理</h5>
        <p class="mt-1 text-[12px] text-slate-500">
          子代理内容不会直接进入主聊天流，后续可从详情面板或 Agent 面板查看。
        </p>
        <p
          class="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-700"
        >
          {{ block.goal }}
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
          class="flex h-9 items-center justify-center rounded-xl border border-sky-200 bg-white px-3 text-[12px] font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          :disabled="!block.childAgentRunId"
          @click="emit('open-agent-run', block.childAgentRunId ?? '')"
        >
          打开
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NormalChatSubAgentMessagePart } from '@preload/types'

const props = defineProps<{
  block: NormalChatSubAgentMessagePart
}>()

const emit = defineEmits<{
  'open-agent-run': [agentRunId: string]
}>()

const statusLabel = computed(() => {
  if (props.block.status === 'completed') {
    return '已完成'
  }
  if (props.block.status === 'failed') {
    return '失败'
  }
  if (props.block.status === 'running') {
    return '进行中'
  }
  return '排队中'
})

const statusClass = computed(() => {
  if (props.block.status === 'completed') {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (props.block.status === 'failed') {
    return 'bg-rose-100 text-rose-700'
  }
  if (props.block.status === 'running') {
    return 'bg-sky-100 text-sky-700'
  }
  return 'bg-slate-100 text-slate-600'
})
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
