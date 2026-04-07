<template>
  <section class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400">Thinking</p>
        <h5 class="mt-1 truncate text-[14px] font-semibold text-slate-900">{{ part.title }}</h5>
      </div>
      <span
        class="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
        :class="part.isStreaming ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-700'"
      >
        {{ part.isStreaming ? 'Streaming' : 'Captured' }}
      </span>
    </div>

    <div class="mt-4 rounded-xl bg-white/90 px-3 py-3">
      <ChatMarkdownContent :content="part.content" :is-pending="Boolean(isPending)" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { NormalChatThinkingMessagePart } from '@preload/types'
import ChatMarkdownContent from './ChatMarkdownContent.vue'

defineProps<{
  part: NormalChatThinkingMessagePart
  isPending?: boolean
}>()
</script>
