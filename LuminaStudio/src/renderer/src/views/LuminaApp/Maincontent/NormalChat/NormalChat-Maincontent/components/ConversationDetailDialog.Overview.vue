<template>
  <section class="space-y-3">
    <div
      v-if="items.length === 0"
      class="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center"
    >
      <p class="text-[13px] font-medium text-gray-700">
        {{ emptyMessage || '当前 turn 没有可用的 LLM 调用明细。' }}
      </p>
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div
        class="grid grid-cols-[64px_360px_250px_88px_88px_24px] items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400"
      >
        <span>No.</span>
        <span>Call</span>
        <span>Context</span>
        <span>Type</span>
        <span>Status</span>
        <span></span>
      </div>

      <button
        v-for="call in items"
        :key="call.id"
        class="grid w-full grid-cols-[64px_360px_250px_88px_88px_24px] items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50"
        type="button"
        @click="emit('open-call', call.id)"
      >
        <span class="truncate text-[12px] font-medium text-gray-500">{{ call.indexLabel }}</span>
        <div class="min-w-0">
          <p class="truncate text-[12px] font-semibold text-gray-900">{{ call.title }}</p>
          <p class="mt-0.5 truncate text-[11px] text-gray-500">{{ call.summary }}</p>
        </div>
        <p class="truncate text-[12px] text-gray-700">{{ call.contextText }}</p>
        <span class="truncate text-[12px] text-gray-600">{{ call.badge }}</span>
        <span
          class="inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-[11px] font-medium"
          :class="call.statusClass"
        >
          {{ call.statusLabel }}
        </span>
        <span class="flex items-center justify-end text-gray-300">
          <svg
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ChatDetailShellCallItem } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.types'

defineProps<{
  items: ChatDetailShellCallItem[]
  emptyMessage?: string | null
}>()

const emit = defineEmits<{
  'open-call': [callId: string]
}>()
</script>
