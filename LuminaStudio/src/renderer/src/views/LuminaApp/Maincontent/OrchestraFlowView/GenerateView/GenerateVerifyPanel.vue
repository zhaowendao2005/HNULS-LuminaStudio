<template>
  <div class="of-generate-verify flex h-full flex-col bg-[#fcfcfd]">
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <div class="flex items-center justify-between gap-4 overflow-hidden">
        <div class="min-w-0 overflow-hidden">
          <div class="text-[13px] font-semibold text-gray-800">校验面板</div>
          <div class="mt-1 truncate text-xs leading-5 text-gray-500">
            当前会话：{{ sessionTitle }}，这里承接需求与设计结果，整理校验项与最终交付检查。
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span class="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
            {{ fileName }}
          </span>
          <button
            type="button"
            title="打开 copilot"
            class="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-800"
            @click="$emit('open-copilot')"
          >
            <MessageSquare :size="15" />
          </button>
          <button
            type="button"
            title="切换会话"
            class="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-800"
            @click="$emit('open-sessions')"
          >
            <FolderKanban :size="15" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-5">
      <div class="mx-auto max-w-5xl border border-gray-200 bg-white">
        <div class="border-b border-gray-100 bg-gray-50/70 px-4 py-2">
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">校验文档</div>
          <div class="mt-1 text-[11px] text-gray-400">
            文本内容与右侧 verify copilot 对话都会持久化到独立数据库。
          </div>
        </div>
        <div class="space-y-3 px-4 py-4 text-[13px] text-gray-700">
          <div class="whitespace-pre-wrap rounded border border-gray-100 bg-gray-50/60 px-3 py-3">
            {{ verifyContent }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderKanban, MessageSquare } from 'lucide-vue-next'

defineProps<{
  sessionTitle: string
  fileName: string
  verifyContent: string
}>()

defineEmits<{
  (e: 'open-copilot'): void
  (e: 'open-sessions'): void
}>()
</script>
