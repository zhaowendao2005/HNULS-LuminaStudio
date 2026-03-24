<template>
  <article class="nc-chat-message-item-a9k2 px-8 py-4">
    <div class="flex items-start gap-3">
      <div
        v-if="message.role === 'user'"
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"
      >
        <UserRound class="h-5 w-5" />
      </div>
      <div
        v-else
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"
      >
        <div
          class="h-8 w-8 rounded-xl"
          :class="
            message.isPending
              ? 'bg-gradient-to-br from-amber-200 via-orange-200 to-rose-300'
              : 'bg-gradient-to-br from-sky-200 via-cyan-200 to-blue-300'
          "
        />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h4 class="text-[14px] font-semibold leading-[1.25] text-gray-900">
            {{ message.author }}
          </h4>
          <span
            v-if="message.isPending"
            class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
          >
            生成中
          </span>
        </div>
        <p class="mt-1 text-xs text-gray-400">{{ message.time }}</p>

        <ChatMessageParts :message="message" @view-detail="emit('open-session', message)" />

        <div class="mt-4 flex items-center gap-2">
          <div class="flex items-center gap-1.5">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              type="button"
              title="更多"
              @click="emit('more', message)"
            >
              <MoreHorizontal class="h-4 w-4" />
            </button>
          </div>

          <div class="h-4 w-px bg-gray-200" />

          <div class="ml-auto flex items-center gap-1.5">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              type="button"
              title="复制为 Markdown"
              @click="emit('copy', message)"
            >
              <Copy class="h-4 w-4" />
            </button>

            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canOperateTurn"
              type="button"
              title="删除这条对话"
              @click="emit('delete', message)"
            >
              <Trash2 class="h-4 w-4" />
            </button>

            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canOperateTurn"
              type="button"
              title="查看完整会话"
              @click="emit('open-session', message)"
            >
              <FileCode2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Copy, FileCode2, MoreHorizontal, Trash2, UserRound } from 'lucide-vue-next'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'
import ChatMessageParts from './ChatMessageParts.vue'

const props = defineProps<{
  message: NormalChatConversationDisplayMessage
}>()

const emit = defineEmits<{
  more: [message: NormalChatConversationDisplayMessage]
  copy: [message: NormalChatConversationDisplayMessage]
  delete: [message: NormalChatConversationDisplayMessage]
  'open-session': [message: NormalChatConversationDisplayMessage]
}>()

const canOperateTurn = computed(() => {
  return Boolean(props.message.requestId) && !props.message.isPending
})
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
