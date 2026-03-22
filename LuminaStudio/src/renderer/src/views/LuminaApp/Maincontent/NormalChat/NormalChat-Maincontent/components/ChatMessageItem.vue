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

        <div
          v-if="message.role === 'user'"
          class="mt-4 whitespace-pre-wrap text-[14px] leading-[1.75] text-gray-800"
        >
          {{ message.text || ' ' }}
        </div>
        <ChatMarkdownContent
          v-else
          class="mt-4"
          :content="message.text"
          :is-pending="Boolean(message.isPending)"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { UserRound } from 'lucide-vue-next'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'
import ChatMarkdownContent from './ChatMarkdownContent.vue'

defineProps<{
  message: NormalChatConversationDisplayMessage
}>()
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
