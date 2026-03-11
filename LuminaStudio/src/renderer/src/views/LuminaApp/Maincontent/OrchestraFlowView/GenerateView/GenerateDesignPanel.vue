<template>
  <div class="of-generate-design flex h-full flex-col bg-[#fcfcfd]">
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <div class="flex items-center justify-between gap-4 overflow-hidden">
        <div class="min-w-0 overflow-hidden">
          <div class="text-[13px] font-semibold text-gray-800">规划设计页</div>
          <div class="mt-1 truncate text-xs leading-5 text-gray-500">
            当前会话：{{ session.title }}，主内容为设计文档编辑器。
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span class="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
            {{ session.design.fileName }}
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
      <div class="mx-auto flex h-full max-w-5xl gap-6">
        <div class="flex min-h-0 flex-1 flex-col border border-gray-200 bg-white">
          <div
            class="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2"
          >
            <div>
              <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                设计正文
              </div>
              <div class="mt-1 text-[11px] text-gray-400">
                可以先手改正文，再交给右侧 copilot 继续处理。
              </div>
            </div>
            <button
              type="button"
              class="rounded-sm bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              @click="$emit('open-copilot')"
            >
              打开 copilot
            </button>
          </div>

          <div class="flex-1 bg-[#fbfbfc] p-4">
            <textarea
              :value="designContent"
              class="h-full min-h-[520px] w-full resize-none border-none bg-transparent font-mono text-[12px] leading-6 text-gray-800 outline-none"
              placeholder="在这里编辑规划设计文档..."
              @input="$emit('update:design-content', ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderKanban, MessageSquare } from 'lucide-vue-next'
import type { SessionItem } from './generate-view.types'

defineProps<{
  session: SessionItem
  designContent: string
}>()

defineEmits<{
  (e: 'update:design-content', value: string): void
  (e: 'open-copilot'): void
  (e: 'open-sessions'): void
}>()
</script>
