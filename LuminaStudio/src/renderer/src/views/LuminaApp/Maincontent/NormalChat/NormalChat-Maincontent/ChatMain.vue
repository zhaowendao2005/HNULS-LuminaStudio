<template>
  <section
    class="nc-chat-main-root-a9k2 nc-normalchat-theme-a9k2 flex-1 min-w-0 rounded-2xl overflow-hidden"
  >
    <ChatMainViewport />
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useNormalChatAssistantShellStore } from '@renderer/stores/normal-chat/assistant-shell/assistant-shell.store'
import { useNormalChatConversationShellStore } from '@renderer/stores/normal-chat/conversation-shell/conversation-shell.store'
import ChatMainViewport from './components/ChatMainViewport.vue'

const assistantStore = useNormalChatAssistantShellStore()
const conversationStore = useNormalChatConversationShellStore()

onMounted(() => {
  // 统一在入口做一次初始化，确保中间区只消费全局状态
  void Promise.all([assistantStore.initialize(), conversationStore.initialize()])
})
</script>

<style scoped lang="scss">
@use '../normal-chat-theme.scss' as *;
</style>
