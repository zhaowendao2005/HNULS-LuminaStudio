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
    <AgentTreeDialog />
  </div>
</template>

<script setup lang="ts">
import ChatHeaderBar from './ChatHeaderBar.vue'
import ChatPromptBar from './ChatPromptBar.vue'
import ChatMessageViewport from './ChatMessageViewport.vue'
import ChatComposerPanel from './ChatComposerPanel.vue'
import AssistantSettingsModal from './AssistantSettingsModal.vue'
import AgentTreeDialog from './AgentTreeDialog.vue'
import ConversationDetailDialog from './ConversationDetailDialog.vue'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import { useNormalChatChatDetailShellStore } from '@renderer/stores/normal-chat/chat-detail-shell/chat-detail-shell.store'
import { useNormalChatAgentDetailShellStore } from '@renderer/stores/normal-chat/agent-detail-shell/agent-detail-shell.store'

const conversationStore = useNormalChatConversationStore()
const chatDetailShellStore = useNormalChatChatDetailShellStore()
const agentDetailShellStore = useNormalChatAgentDetailShellStore()

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

function serializeMessageForCopy(message: NormalChatConversationDisplayMessage): string {
  if (message.parts.length === 0) {
    return message.text
  }

  return message.parts
    .map((part) => {
      if (part.kind === 'text') {
        return part.text
      }

      if (part.kind === 'thinking') {
        return [`Thinking: ${part.title}`, part.content].join('\n')
      }

      if (part.kind !== 'functioncall') {
        return ''
      }

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
    .trim()
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
  agentDetailShellStore.clearTurnDetail(message.requestId)
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

async function handleOpenAgentTree(message: NormalChatConversationDisplayMessage): Promise<void> {
  if (!message.requestId) {
    return
  }

  await agentDetailShellStore.openDialog({
    requestId: message.requestId,
    messageId: message.id
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
