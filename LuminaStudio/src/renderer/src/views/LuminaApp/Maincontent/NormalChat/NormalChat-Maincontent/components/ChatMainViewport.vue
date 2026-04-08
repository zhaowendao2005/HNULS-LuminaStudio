<template>
  <div
    class="nc-chat-main-viewport-a9k2 flex h-full flex-col bg-[var(--nc-bg-main)] text-[15px] text-[var(--nc-text-main)]"
  >
    <ChatHeaderBar />
    <ChatPromptBar />
    <ChatMessageViewport
      @copy-message="handleCopyMessage"
      @delete-message="handleDeleteMessage"
      @more-message="handleMoreMessage"
      @open-message-session="handleOpenMessageSession"
      @open-agent-tree="handleOpenAgentTree"
      @open-functioncall-detail="handleOpenFunctionCallDetail"
    />
    <ChatComposerPanel />
    <AssistantSettingsModal />
    <ConversationDetailDialog />
  </div>
</template>

<script setup lang="ts">
import ChatHeaderBar from './ChatHeaderBar.vue'
import ChatPromptBar from './ChatPromptBar.vue'
import ChatMessageViewport from './ChatMessageViewport.vue'
import ChatComposerPanel from './ChatComposerPanel.vue'
import AssistantSettingsModal from './AssistantSettingsModal.vue'
import ConversationDetailDialog from './ConversationDetailDialog.vue'
import type {
  NormalChatConversationDisplayMessage,
  NormalChatRenderBlock
} from '@renderer/stores/normal-chat/conversation/conversation.types'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import { useNormalChatChatDetailShellStore } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.store'
const conversationStore = useNormalChatConversationStore()
const chatDetailShellStore = useNormalChatChatDetailShellStore()

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
    return [`SubAgent: ${block.goal}`, `ChildAgentRunId: ${block.childAgentRunId ?? '--'}`].join(
      '\n'
    )
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
