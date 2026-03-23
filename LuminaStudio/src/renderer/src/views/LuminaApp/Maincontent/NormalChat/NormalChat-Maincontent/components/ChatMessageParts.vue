<template>
  <div class="nc-chat-message-parts-a9k2 mt-4 space-y-3">
    <template v-if="message.parts.length > 0">
      <template v-for="(part, index) in message.parts" :key="partKey(part, index)">
        <div v-if="part.kind === 'text'">
          <div
            v-if="message.role === 'user'"
            class="whitespace-pre-wrap break-words text-[14px] leading-[1.75] text-gray-800"
          >
            {{ part.text || ' ' }}
          </div>
          <ChatMarkdownContent
            v-else
            class=""
            :content="part.text"
            :is-pending="Boolean(message.isPending)"
          />
        </div>

        <FunctionCallMessageBlock v-else :part="part" :is-pending="Boolean(message.isPending)" />
      </template>
    </template>

    <div v-else-if="message.text">
      <div
        v-if="message.role === 'user'"
        class="whitespace-pre-wrap break-words text-[14px] leading-[1.75] text-gray-800"
      >
        {{ message.text || ' ' }}
      </div>
      <ChatMarkdownContent
        v-else
        class=""
        :content="message.text"
        :is-pending="Boolean(message.isPending)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatMarkdownContent from './ChatMarkdownContent.vue'
import FunctionCallMessageBlock from './FunctionCallMessageBlock.vue'
import type { NormalChatMessagePart } from '@preload/types'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'

defineProps<{
  message: NormalChatConversationDisplayMessage
}>()

function partKey(part: NormalChatMessagePart, index: number): string {
  if (part.kind === 'functioncall') {
    return `${part.kind}-${part.callId}-${index}`
  }

  return `${part.kind}-${index}`
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
