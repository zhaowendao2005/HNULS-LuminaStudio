<template>
  <section class="nc-chat-message-viewport-a9k2 flex-1 overflow-y-auto">
    <div class="px-8 pb-2 pt-2">
      <pre class="whitespace-pre-wrap text-[13px] leading-6 text-gray-900">{{
        conversationSnapshot.headerText
      }}</pre>
    </div>

    <ChatMessageItem
      v-for="message in conversationSnapshot.messages"
      :key="message.id"
      :message="message"
    />
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useNormalChatConversationShellStore } from '@renderer/stores/normal-chat/conversation-shell/conversation-shell.store'
import ChatMessageItem from './ChatMessageItem.vue'

const conversationStore = useNormalChatConversationShellStore()
const { snapshot: conversationSnapshot } = storeToRefs(conversationStore)
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
