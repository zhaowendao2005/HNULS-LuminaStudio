<template>
  <section
    ref="viewportRef"
    class="nc-chat-message-viewport-a9k2 flex-1 overflow-y-auto bg-[var(--nc-bg-main)]"
    @scroll="handleViewportScroll"
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
          @open-functioncall-detail="emit('open-functioncall-detail', $event)"
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
const autoStickToBottom = ref(true)
const BOTTOM_STICK_THRESHOLD_PX = 96

const emit = defineEmits<{
  'copy-message': [message: NormalChatConversationDisplayMessage]
  'delete-message': [message: NormalChatConversationDisplayMessage]
  'more-message': [message: NormalChatConversationDisplayMessage]
  'open-message-session': [message: NormalChatConversationDisplayMessage]
  'open-agent-tree': [
    payload: { message: NormalChatConversationDisplayMessage; agentRunId: string }
  ]
  'open-functioncall-detail': [
    payload: { message: NormalChatConversationDisplayMessage; callId: string }
  ]
}>()

function isNearBottom(): boolean {
  const viewport = viewportRef.value
  if (!viewport) {
    return true
  }

  const distanceToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
  return distanceToBottom <= BOTTOM_STICK_THRESHOLD_PX
}

function handleViewportScroll(): void {
  autoStickToBottom.value = isNearBottom()
}

async function scrollToBottom(behavior: ScrollBehavior = 'auto'): Promise<void> {
  await nextTick()
  const viewport = viewportRef.value
  if (!viewport) {
    return
  }

  viewport.scrollTo({
    top: viewport.scrollHeight,
    behavior
  })
  autoStickToBottom.value = true
}

watch(
  () => workspaceStore.currentTopic?.id ?? '',
  () => {
    autoStickToBottom.value = true
    void scrollToBottom('auto')
  },
  { immediate: true }
)

watch(
  () =>
    currentMessages.value
      .map((message) =>
        [
          message.id,
          message.blocks
            .map((block) => {
              if (block.kind === 'markdown') {
                return `${block.kind}:${block.text}`
              }
              if (block.kind === 'thinking') {
                return `${block.kind}:${block.part.title}:${block.part.content}`
              }
              if (block.kind === 'function-batch') {
                return `${block.kind}:${block.calls
                  .map(
                    (part) =>
                      `${part.callId}:${part.status}:${part.input}:${part.output}:${part.errorMessage ?? ''}`
                  )
                  .join('|')}`
              }
              return `${block.kind}:${block.label}`
            })
            .join('|'),
          message.isPending ? '1' : '0'
        ].join(':')
      )
      .join('|'),
  (_nextValue, previousValue) => {
    if (!previousValue || autoStickToBottom.value) {
      void scrollToBottom('auto')
    }
  }
)

watch(
  () => conversationStore.currentStatusText,
  () => {
    if (autoStickToBottom.value) {
      void scrollToBottom('auto')
    }
  }
)
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
