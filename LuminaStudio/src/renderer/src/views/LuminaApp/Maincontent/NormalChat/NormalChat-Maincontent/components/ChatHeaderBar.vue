<template>
  <header
    class="nc-chat-header-a9k2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-[var(--nc-border-soft)] bg-[var(--nc-panel-bg)] px-4 py-2.5"
  >
    <div class="flex min-w-0 items-center gap-2 overflow-hidden">
      <button
        class="flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 transition-colors hover:bg-gray-100"
        type="button"
        :title="workspaceStore.currentAssistant?.name ?? '未选择助手'"
        @click="workspaceStore.openAssistantSettings('assistant')"
      >
        <span class="nc-default-assistant-avatar-a9k2 text-sm">
          {{ currentAssistant?.emoji ?? '🤖' }}
        </span>
        <span class="truncate text-[14px] font-medium text-gray-700">
          {{ currentAssistant?.name ?? '未选择助手' }}
        </span>
      </button>

      <span class="shrink-0 text-gray-300">--</span>

      <span
        class="min-w-0 truncate text-[14px] font-medium text-gray-600"
        :title="currentTopic?.title ?? '未选择话题'"
      >
        {{ currentTopic?.title ?? '未选择话题' }}
      </span>
    </div>

    <button
      class="nc-model-pill-a9k2 flex min-w-[240px] max-w-[320px] items-center gap-1.5 justify-self-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[14px] text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
      type="button"
      :title="workspaceStore.currentTopicModelLabel"
      @click="workspaceStore.openHeaderModelSelector"
    >
      <span class="max-w-[260px] truncate">{{ workspaceStore.currentTopicModelLabel }}</span>
      <svg class="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none">
        <path
          d="M5 7.5L10 12.5L15 7.5"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        />
      </svg>
    </button>

    <ModelSelector
      :visible="workspaceStore.headerModelSelectorOpen"
      :current-provider-id="currentTopicModelSelection?.provider.id ?? null"
      :current-model-id="currentTopicModelSelection?.model.id ?? null"
      title="切换当前话题模型"
      :show-manage-button="false"
      @update:visible="handleHeaderModelSelectorVisible"
      @select="handleHeaderModelSelect"
    />

    <div class="flex items-center justify-end gap-1 text-gray-500">
      <button
        class="rounded-md p-1.5 transition-colors hover:bg-gray-100"
        type="button"
        @click="workspaceStore.openTopicSettings"
      >
        <Settings2 class="h-5 w-5 stroke-[1.5]" />
      </button>
      <button class="rounded-md p-1.5 transition-colors hover:bg-gray-100" type="button">
        <SplitSquareHorizontal class="h-5 w-5 stroke-[1.5]" />
      </button>
      <button class="rounded-md p-1.5 transition-colors hover:bg-gray-100" type="button">
        <Search class="h-5 w-5 stroke-[1.5]" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Search, Settings2, SplitSquareHorizontal } from 'lucide-vue-next'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const workspaceStore = useNormalChatWorkspaceStore()

const { currentAssistant, currentTopic, currentTopicModelSelection } = storeToRefs(workspaceStore)

function handleHeaderModelSelectorVisible(value: boolean): void {
  if (value) {
    workspaceStore.openHeaderModelSelector()
    return
  }

  workspaceStore.closeHeaderModelSelector()
}

async function handleHeaderModelSelect(payload: {
  provider: { id: string }
  model: { id: string }
}): Promise<void> {
  await workspaceStore.quickSelectCurrentTopicModel(payload.provider.id, payload.model.id)
  workspaceStore.closeHeaderModelSelector()
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
