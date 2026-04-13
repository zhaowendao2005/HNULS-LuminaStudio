<template>
  <div
    class="nc-chat-main-viewport-a9k2 relative flex h-full flex-col bg-[var(--nc-bg-main)] text-[15px] text-[var(--nc-text-main)]"
  >
    <ChatHeaderBar />
    <ChatPromptBar />
    <ChatMessageViewport
      @copy-message="handleCopyMessage"
      @resend-message="handleResendMessage"
      @delete-message="handleDeleteMessage"
      @more-message="handleMoreMessage"
      @open-message-session="handleOpenMessageSession"
      @open-agent-tree="handleOpenAgentTree"
      @open-functioncall-detail="handleOpenFunctionCallDetail"
    />
    <div
      class="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-6"
      :style="overlayStyle"
    >
      <Transition name="retrieval-panel" mode="out-in">
        <div v-if="retrievalStore.activePanel" class="pointer-events-auto w-full">
          <VectorRetrievalPanel v-if="retrievalStore.activePanel === 'vector'" />
          <KGRetrievalPanel v-else />
        </div>
      </Transition>
    </div>
    <div ref="composerHostRef" class="relative z-20">
      <ChatComposerPanel />
    </div>
    <AssistantSettingsModal />
    <ConversationDetailDialog />
  </div>
</template>

<script setup lang="ts">
import ChatHeaderBar from './ChatHeaderBar.vue'
import ChatPromptBar from './ChatPromptBar.vue'
import ChatMessageViewport from './ChatMessageViewport.vue'
import ChatComposerPanel from './ChatComposerPanel.vue'
import VectorRetrievalPanel from './VectorRetrievalPanel.vue'
import KGRetrievalPanel from './KGRetrievalPanel.vue'
import AssistantSettingsModal from './AssistantSettingsModal.vue'
import ConversationDetailDialog from './ConversationDetailDialog.vue'
import type {
  NormalChatConversationDisplayMessage,
  NormalChatRenderBlock
} from '@renderer/stores/normal-chat/conversation/conversation.types'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import { useNormalChatChatDetailShellStore } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.store'
import { useNormalChatRetrievalConfigStore } from '@renderer/stores/normal-chat/retrieval-config/retrieval-config.store'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
const conversationStore = useNormalChatConversationStore()
const chatDetailShellStore = useNormalChatChatDetailShellStore()
const retrievalStore = useNormalChatRetrievalConfigStore()
const composerHostRef = ref<HTMLElement | null>(null)
const composerHeight = ref(0)
let composerResizeObserver: ResizeObserver | null = null

const overlayStyle = computed(() => ({
  bottom: `${composerHeight.value}px`
}))

function syncComposerHeight(): void {
  const host = composerHostRef.value
  composerHeight.value = host?.getBoundingClientRect().height ?? 0
}

onMounted(() => {
  syncComposerHeight()
  if (composerHostRef.value && typeof ResizeObserver !== 'undefined') {
    composerResizeObserver = new ResizeObserver(() => {
      syncComposerHeight()
    })
    composerResizeObserver.observe(composerHostRef.value)
  }
})

onBeforeUnmount(() => {
  composerResizeObserver?.disconnect()
  composerResizeObserver = null
})

async function handleCopyMessage(message: NormalChatConversationDisplayMessage): Promise<void> {
  const textToCopy = serializeMessageForCopy(message)
  if (!textToCopy) {
    return
  }

  try {
    await navigator.clipboard.writeText(textToCopy)
  } catch {
    // Clipboard may be unavailable in some environments.
  }
}

// 复制逻辑与主聊天渲染保持一致，统一从 render blocks 序列化，避免再回退到 raw parts。
function serializeMessageForCopy(message: NormalChatConversationDisplayMessage): string {
  if (message.blocks.length === 0) {
    return message.text
  }

  return message.blocks
    .map((block) => serializeBlockForCopy(block))
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function serializeBlockForCopy(block: NormalChatRenderBlock): string {
  if (block.kind === 'markdown') {
    return block.text
  }

  if (block.kind === 'thinking') {
    return [`Thinking: ${block.part.title}`, block.part.content].join('\n')
  }

  if (block.kind === 'placeholder') {
    return ''
  }

  if (block.kind === 'subagent') {
    return ''
  }

  return block.calls
    .map((part) => {
      const sections = [
        `FunctionCall: ${part.title}`,
        `CallName: ${part.functionCallName}`,
        `Input:\n${part.input || '--'}`,
        `Output:\n${part.output || '--'}`
      ]

      if (part.errorMessage) {
        sections.push(`Error:\n${part.errorMessage}`)
      }

      return sections.join('\n')
    })
    .join('\n\n')
}

async function handleDeleteMessage(message: NormalChatConversationDisplayMessage): Promise<void> {
  if (!message.requestId) {
    return
  }

  const confirmed = window.confirm(
    'Are you sure you want to delete this turn and all persisted messages for the request?'
  )
  if (!confirmed) {
    return
  }

  await conversationStore.deleteConversationTurn(message.requestId)
  chatDetailShellStore.clearTurnDetail(message.requestId)
}

async function handleResendMessage(message: NormalChatConversationDisplayMessage): Promise<void> {
  if (!message.requestId || message.role !== 'assistant' || message.isPending) {
    return
  }

  const sourceMessage = conversationStore.currentDisplayMessages.find(
    (item) => item.requestId === message.requestId && item.role === 'user'
  )
  const sourceInput = sourceMessage?.text.trim()
  if (!sourceInput) {
    return
  }

  const confirmed = window.confirm(
    'Are you sure you want to delete this turn, restore the original user message, and resend it?'
  )
  if (!confirmed) {
    return
  }

  await conversationStore.deleteConversationTurn(message.requestId)
  chatDetailShellStore.clearTurnDetail(message.requestId)
  conversationStore.setDraftText(sourceInput)
  await conversationStore.sendCurrentDraft().catch(() => undefined)
}

function handleMoreMessage(): void {
  // Reserved for future message actions.
}

async function handleOpenMessageSession(
  message: NormalChatConversationDisplayMessage
): Promise<void> {
  if (!message.requestId) {
    return
  }

  await chatDetailShellStore.openDialog({
    requestId: message.requestId,
    messageId: message.id
  })
}

async function handleOpenAgentTree(payload: {
  message: NormalChatConversationDisplayMessage
  agentRunId: string
}): Promise<void> {
  if (!payload.message.requestId) {
    return
  }

  await chatDetailShellStore.openDialog({
    requestId: payload.message.requestId,
    messageId: payload.message.id,
    page: 'agent',
    focusAgentRunId: payload.agentRunId
  })
}

async function handleOpenFunctionCallDetail(payload: {
  message: NormalChatConversationDisplayMessage
  callId: string
}): Promise<void> {
  if (!payload.message.requestId) {
    return
  }

  await chatDetailShellStore.openDialog({
    requestId: payload.message.requestId,
    messageId: payload.message.id,
    page: 'functioncall-detail',
    selectedFunctioncallId: payload.callId
  })
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>

<style scoped>
.retrieval-panel-enter-active,
.retrieval-panel-leave-active {
  transform-origin: bottom center;
}

.retrieval-panel-enter-active {
  animation: retrieval-panel-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.retrieval-panel-leave-active {
  animation: retrieval-panel-out 120ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes retrieval-panel-in {
  0% {
    opacity: 0;
    transform: translateY(10px) scaleY(0.78);
    filter: blur(2px);
  }

  68% {
    opacity: 1;
    transform: translateY(-2px) scaleY(1.03);
    filter: blur(0);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scaleY(1);
    filter: blur(0);
  }
}

@keyframes retrieval-panel-out {
  0% {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }

  100% {
    opacity: 0;
    transform: translateY(8px) scaleY(0.9);
  }
}
</style>
