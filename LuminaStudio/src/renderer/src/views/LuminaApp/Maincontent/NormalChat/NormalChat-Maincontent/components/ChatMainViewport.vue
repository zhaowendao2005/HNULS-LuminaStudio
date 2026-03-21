<template>
  <div
    class="nc-chat-main-viewport-a9k2 flex h-full flex-col bg-[var(--nc-bg-main)] text-[15px] text-[var(--nc-text-main)]"
  >
    <ChatHeaderBar />
    <ChatPromptBar />
    <ChatMessageViewport />
    <ChatComposerPanel />
    <AssistantSettingsModal />
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
import ModelSelector from '@renderer/components/ModelSelector'
import type { Model, ModelProvider } from '@renderer/stores/model-config/types'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const workspaceStore = useNormalChatWorkspaceStore()
const { modelSelectorOpen, currentTopicModelProviderId, currentTopicModelId } =
  storeToRefs(workspaceStore)

function handleModelSelect(payload: { provider: ModelProvider; model: Model }): void {
  workspaceStore.selectCurrentTopicModel(payload.provider.id, payload.model.id)
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
