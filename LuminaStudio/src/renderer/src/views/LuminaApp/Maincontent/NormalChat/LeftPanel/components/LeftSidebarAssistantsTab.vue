<template>
  <div class="nc-left-assistants-tab-a9k2 flex h-full flex-col py-2">
    <button
      class="mx-2 mb-2 flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] text-gray-600 transition-colors hover:bg-gray-200/50"
      type="button"
      @click="emit('create-assistant')"
    >
      <Plus class="h-4 w-4" />
      添加助手
    </button>

    <div class="px-2">
      <div
        v-for="assistant in assistants"
        :key="assistant.id"
        class="mb-4 flex cursor-pointer items-center justify-between rounded-lg border p-2 shadow-sm transition-colors"
        :class="
          assistant.id === activeAssistantId
            ? 'border-emerald-200 bg-emerald-50/70'
            : 'border-gray-100 bg-white hover:border-gray-200'
        "
        @click="emit('select-assistant', assistant.id)"
      >
        <div class="flex items-center gap-3">
          <span class="nc-default-assistant-avatar-a9k2 text-sm">{{ assistant.emoji }}</span>
          <span class="text-[14px] font-medium text-gray-800">{{ assistant.name }}</span>
        </div>
        <button
          class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          type="button"
          @click.stop="emit('open-settings', assistant.id)"
        >
          <MoreVertical class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div
      class="flex cursor-pointer items-center gap-1 px-4 py-2 text-[13px] text-gray-500 hover:text-gray-800"
    >
      <ChevronRight class="h-3.5 w-3.5" />
      绘图
    </div>

    <div
      class="flex cursor-pointer items-center gap-1 px-4 py-2 text-[13px] text-gray-500 hover:text-gray-800"
    >
      <ChevronDown class="h-3.5 w-3.5" />
      tools
    </div>

    <div class="mt-1 flex flex-col gap-1 px-2">
      <div
        v-for="tool in tools"
        :key="tool.id"
        class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-gray-700 transition-colors hover:bg-gray-200/50"
      >
        <LeftSidebarSparkleIcon />
        {{ tool.title }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, ChevronRight, MoreVertical, Plus } from 'lucide-vue-next'
import type { NormalChatAssistant } from '@preload/types'
import LeftSidebarSparkleIcon from './LeftSidebarSparkleIcon.vue'

defineProps<{
  assistants: NormalChatAssistant[]
  activeAssistantId: string
}>()

const tools = [
  { id: 'tool-1', title: '排版为表格' },
  { id: 'tool-2', title: '排版英语习题' },
  { id: 'tool-3', title: '内容校对' },
  { id: 'tool-4', title: '排版为表格-v2' }
]

const emit = defineEmits<{
  (e: 'create-assistant'): void
  (e: 'open-settings', assistantId: string): void
  (e: 'select-assistant', assistantId: string): void
}>()
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
