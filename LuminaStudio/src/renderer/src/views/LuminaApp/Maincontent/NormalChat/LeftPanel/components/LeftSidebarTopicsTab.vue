<template>
  <div class="nc-left-topics-tab-a9k2 flex h-full flex-col px-2 py-2">
    <button
      class="mb-2 flex items-center justify-between rounded-lg px-2 py-2 text-[14px] text-gray-600 transition-colors hover:bg-gray-200/50"
      type="button"
      @click="emit('add-topic')"
    >
      <span class="flex items-center gap-2">
        <Plus class="h-4 w-4" />
        新建话题
      </span>
      <ListPlus class="h-4 w-4 text-gray-400" />
    </button>

    <div
      v-for="topic in topics"
      :key="topic.id"
      class="group flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors"
      :class="
        topic.id === activeTopicId
          ? 'border border-gray-100 bg-white shadow-sm'
          : 'border-0 bg-transparent shadow-none'
      "
      @click="emit('select-topic', topic.id)"
    >
      <span class="text-[14px] font-medium text-gray-800">{{ topic.title }}</span>
      <button
        class="rounded-md p-0.5 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600"
        type="button"
        @click.stop="emit('remove-topic', topic.id)"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ListPlus, Plus, X } from 'lucide-vue-next'
import type { LeftSidebarTopic } from '@renderer/stores/normal-chat/left-sidebar-shell/left-sidebar-shell.types'

defineProps<{
  topics: LeftSidebarTopic[]
  activeTopicId: string
}>()

const emit = defineEmits<{
  (e: 'add-topic'): void
  (e: 'select-topic', topicId: string): void
  (e: 'remove-topic', topicId: string): void
}>()
</script>
