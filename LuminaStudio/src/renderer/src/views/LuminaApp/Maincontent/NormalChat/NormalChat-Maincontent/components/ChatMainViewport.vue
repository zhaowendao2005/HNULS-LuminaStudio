<template>
  <div
    class="nc-chat-main-viewport-a9k2 flex h-full flex-col bg-[var(--nc-bg-main)] text-[15px] text-[var(--nc-text-main)]"
  >
    <ChatHeaderBar />
    <ChatPromptBar />
    <ChatMessageViewport />
    <ChatComposerPanel />
    <AssistantSettingsModal />
  </div>
</template>

<script setup lang="ts">
import ChatHeaderBar from './ChatHeaderBar.vue'
import ChatPromptBar from './ChatPromptBar.vue'
import ChatMessageViewport from './ChatMessageViewport.vue'
import ChatComposerPanel from './ChatComposerPanel.vue'
import AssistantSettingsModal from './AssistantSettingsModal.vue'
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
