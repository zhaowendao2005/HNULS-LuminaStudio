<template>
  <section class="nc-chat-message-viewport-a9k2 flex-1 overflow-y-auto">
    <div class="flex h-full items-center justify-center px-8 py-10">
      <div
        class="w-full max-w-2xl rounded-3xl border border-dashed border-gray-200 bg-white/80 p-8 text-center"
      >
        <p class="text-[13px] uppercase tracking-[0.2em] text-gray-400">Normal Chat</p>
        <h2 class="mt-3 text-[22px] font-semibold text-gray-900">
          {{ workspaceStore.currentTopic?.title ?? '还没有可用话题' }}
        </h2>
        <p class="mt-3 text-[14px] leading-7 text-gray-600">
          当前助手：{{ workspaceStore.currentAssistant?.name ?? '未选择助手' }}。
          第一批先打通助手、话题和 system prompt 持久化，真实消息流将在下一批接入。
        </p>
        <div class="mt-6 rounded-2xl bg-gray-50 p-4 text-left">
          <p class="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Effective System Prompt
          </p>
          <pre class="whitespace-pre-wrap text-[13px] leading-6 text-gray-700">{{
            workspaceStore.effectiveSystemPrompt || '当前没有 system prompt。'
          }}</pre>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const workspaceStore = useNormalChatWorkspaceStore()
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
