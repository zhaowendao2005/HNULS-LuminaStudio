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
    <ConversationDetailDialog
      v-model:visible="conversationDetailOpen"
      :request-id="conversationDetailRequestId"
      :message-id="conversationDetailMessageId"
      :focus-call-id="conversationDetailFocusCallId"
    />
    <!-- TODO(normal-chat-rewrite): 该入口先保留，后续接入新运行时可视化面板。 -->
    <AgentTreeDialog v-model:visible="agentTreeDialogOpen" :request-id="agentTreeDialogRequestId" />
    <ModelSelector
      v-model:visible="modelSelectorOpen"
      :current-provider-id="currentTopicModelProviderId"
      :current-model-id="currentTopicModelId"
      title="选择当前话题模型"
      hint-text="选择结果会写入本地，并在进入话题时与后端模型列表自动校准。"
      :show-manage-button="false"
      @select="handleModelSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import ChatHeaderBar from './ChatHeaderBar.vue'
import ChatPromptBar from './ChatPromptBar.vue'
import ChatMessageViewport from './ChatMessageViewport.vue'
import ChatComposerPanel from './ChatComposerPanel.vue'
import AssistantSettingsModal from './AssistantSettingsModal.vue'
import AgentTreeDialog from './AgentTreeDialog.vue'
import ConversationDetailDialog from './ConversationDetailDialog.vue'
import ModelSelector from '@renderer/components/ModelSelector'
import type { Model, ModelProvider } from '@renderer/stores/model-config/types'
import type { NormalChatConversationDisplayMessage } from '@renderer/stores/normal-chat/conversation/conversation.types'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'
import { useNormalChatConversationStore } from '@renderer/stores/normal-chat/conversation/conversation.store'
import { ref } from 'vue'

const workspaceStore = useNormalChatWorkspaceStore()
const conversationStore = useNormalChatConversationStore()
const { modelSelectorOpen, currentTopicModelProviderId, currentTopicModelId } =
  storeToRefs(workspaceStore)
const conversationDetailOpen = ref(false)
const conversationDetailRequestId = ref('')
const conversationDetailMessageId = ref('')
const conversationDetailFocusCallId = ref('')
const agentTreeDialogOpen = ref(false)
const agentTreeDialogRequestId = ref('')

function handleModelSelect(payload: { provider: ModelProvider; model: Model }): void {
  workspaceStore.selectCurrentTopicModel(payload.provider.id, payload.model.id)
}

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
  if (conversationDetailRequestId.value === message.requestId) {
    conversationDetailOpen.value = false
    conversationDetailRequestId.value = ''
  }
}

function handleMoreMessage(): void {
  // 更多菜单先保留占位，后续再挂具体扩展项。
}

function handleOpenMessageSession(message: NormalChatConversationDisplayMessage): void {
  if (!message.requestId) {
    return
  }

  conversationDetailRequestId.value = message.requestId
  conversationDetailMessageId.value = message.id
  conversationDetailFocusCallId.value = ''
  conversationDetailOpen.value = true
}

// TODO(normal-chat-rewrite): 这里只保留“打开运行树”接口，后续替换为新系统详情面板。
function handleOpenAgentTree(message: NormalChatConversationDisplayMessage): void {
  if (!message.requestId) {
    return
  }

  agentTreeDialogRequestId.value = message.requestId
  agentTreeDialogOpen.value = true
}

function handleOpenFunctionCallDetail(payload: {
  message: NormalChatConversationDisplayMessage
  callId: string
}): void {
  if (!payload.message.requestId) {
    return
  }

  conversationDetailRequestId.value = payload.message.requestId
  conversationDetailMessageId.value = payload.message.id
  conversationDetailFocusCallId.value = payload.callId
  conversationDetailOpen.value = true
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
