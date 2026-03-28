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
    <!-- TODO(normal-chat-rewrite): 该入口先保留，后续接入新运行时可视化面板。 -->
    <AgentTreeDialog v-model:visible="agentTreeDialogOpen" :request-id="agentTreeDialogRequestId" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChatHeaderBar from './ChatHeaderBar.vue'
import ChatPromptBar from './ChatPromptBar.vue'
import ChatMessageViewport from './ChatMessageViewport.vue'
import ChatComposerPanel from './ChatComposerPanel.vue'
import AssistantSettingsModal from './AssistantSettingsModal.vue'
import AgentTreeDialog from './AgentTreeDialog.vue'
import ConversationDetailDialog from './ConversationDetailDialog.vue'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import { useNormalChatConversationDetailShellStore } from '@renderer/stores/normal-chat/conversation-detail-shell/conversation-detail-shell.store'

const conversationStore = useNormalChatConversationStore()
const conversationDetailShellStore = useNormalChatConversationDetailShellStore()
const agentTreeDialogOpen = ref(false)
const agentTreeDialogRequestId = ref('')

async function handleCopyMessage(message: NormalChatConversationDisplayMessage): Promise<void> {
  const textToCopy = serializeMessageForCopy(message)
  if (!textToCopy) {
    return
  }

  try {
    await navigator.clipboard.writeText(textToCopy)
  } catch {
    // 剪贴板不可用时不阻断 Normal Chat。
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

      const sections = [
        `FunctionCall: ${part.title}`,
        `CallName: ${part.functionCallName}`,
        `Input:\n${part.input || '无'}`,
        `Output:\n${part.output || '无'}`
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
    '确定要删除这段完整对话吗？这会从数据库里移除对应 turn 的所有消息。'
  )
  if (!confirmed) {
    return
  }

  await conversationStore.deleteConversationTurn(message.requestId)
  conversationDetailShellStore.clearTurnDetail(message.requestId)
}

function handleMoreMessage(): void {
  // 更多菜单先保留占位，后续再挂具体扩展项。
}

async function handleOpenMessageSession(
  message: NormalChatConversationDisplayMessage
): Promise<void> {
  if (!message.requestId) {
    return
  }

  await conversationDetailShellStore.openDialog({
    requestId: message.requestId,
    messageId: message.id
  })
}

// TODO(normal-chat-rewrite): 这里只保留“打开运行树”接口，后续替换为新系统详情面板。
function handleOpenAgentTree(message: NormalChatConversationDisplayMessage): void {
  if (!message.requestId) {
    return
  }

  agentTreeDialogRequestId.value = message.requestId
  agentTreeDialogOpen.value = true
}

async function handleOpenFunctionCallDetail(payload: {
  message: NormalChatConversationDisplayMessage
  callId: string
}): Promise<void> {
  if (!payload.message.requestId) {
    return
  }

  await conversationDetailShellStore.openDialog({
    requestId: payload.message.requestId,
    messageId: payload.message.id,
    focusCallId: payload.callId
  })
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
