<template>
  <section
    ref="viewportRef"
    class="nc-chat-message-viewport-a9k2 flex-1 overflow-y-auto bg-[var(--nc-bg-main)]"
  >
    <div
      v-if="currentMessages.length === 0"
      class="flex h-full items-center justify-center px-8 py-10"
    >
      <div
        class="w-full max-w-2xl rounded-3xl border border-dashed border-gray-200 bg-white/80 p-8 text-center"
      >
        <p class="text-[13px] uppercase tracking-[0.2em] text-gray-400">Normal Chat</p>
        <h2 class="mt-3 text-[22px] font-semibold text-gray-900">
          {{ workspaceStore.currentTopic?.title ?? '还没有可用话题' }}
        </h2>
        <p class="mt-3 text-[14px] leading-7 text-gray-600">
          当前助手：{{ workspaceStore.currentAssistant?.name ?? '未选择助手' }}。
          现在已经接入真实消息流，可以直接发送消息。
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

    <div v-else class="flex min-h-full flex-col justify-end">
      <div class="space-y-1 py-4">
        <ChatMessageItem
          v-for="message in currentMessages"
          :key="message.id"
          :message="message"
          @copy="emit('copy-message', $event)"
          @delete="emit('delete-message', $event)"
          @more="emit('more-message', $event)"
          @open-session="emit('open-message-session', $event)"
          @open-agent-tree="emit('open-agent-tree', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import ChatMessageItem from './ChatMessageItem.vue'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'

const workspaceStore = useNormalChatWorkspaceStore()
const conversationStore = useNormalChatConversationStore()

const currentMessages = computed(() => conversationStore.currentDisplayMessages)
const viewportRef = ref<HTMLElement | null>(null)

const emit = defineEmits<{
  'copy-message': [message: NormalChatConversationDisplayMessage]
  'delete-message': [message: NormalChatConversationDisplayMessage]
  'more-message': [message: NormalChatConversationDisplayMessage]
  'open-message-session': [message: NormalChatConversationDisplayMessage]
  'open-agent-tree': [message: NormalChatConversationDisplayMessage]
}>()

async function scrollToBottom(): Promise<void> {
  await nextTick()
  viewportRef.value?.scrollTo({ top: viewportRef.value.scrollHeight, behavior: 'smooth' })
}

watch(
  () =>
    currentMessages.value
      .map((message) =>
        [
          message.id,
          message.parts
            .map((part) =>
              part.kind === 'functioncall'
                ? `${part.kind}:${part.callId}:${part.status}:${part.input}:${part.output}:${part.errorMessage ?? ''}`
                : `${part.kind}:${part.text}`
            )
            .join('|'),
          message.isPending ? '1' : '0'
        ].join(':')
      )
      .join('|'),
  () => {
    void scrollToBottom()
  }
)

watch(
  () => conversationStore.currentStatusText,
  () => {
    void scrollToBottom()
  }
)
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
