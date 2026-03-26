<template>
  <div class="nc-chat-prompt-bar-a9k2 px-6 py-4">
    <button
      class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-[14px] shadow-sm transition-all hover:border-gray-300 hover:shadow"
      :class="workspaceStore.currentTopicUsesAssistantPrompt ? 'text-gray-400' : 'text-gray-800'"
      type="button"
      @click="workspaceStore.openTopicSettings"
    >
      {{ workspaceStore.effectiveSystemPrompt || '当前还没有 system prompt，点击这里配置。' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const workspaceStore = useNormalChatWorkspaceStore()
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
