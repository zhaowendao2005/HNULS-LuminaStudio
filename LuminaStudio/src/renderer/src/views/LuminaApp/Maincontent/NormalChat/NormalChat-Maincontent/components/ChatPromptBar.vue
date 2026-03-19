<template>
  <div class="nc-chat-prompt-bar-a9k2 px-6 py-4">
    <button
      class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-[14px] text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:shadow"
      type="button"
      @click="assistantStore.openSettings('prompt')"
    >
      {{ assistantSnapshot.systemPromptPreview }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useNormalChatAssistantShellStore } from '@renderer/stores/normal-chat/assistant-shell/assistant-shell.store'

const assistantStore = useNormalChatAssistantShellStore()
const { snapshot: assistantSnapshot } = storeToRefs(assistantStore)
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
