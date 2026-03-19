<template>
  <div class="nc-left-conversation-page-a9k2 h-full overflow-hidden">
    <div class="flex items-center border-b border-gray-200 px-3 pt-3">
      <button
        class="relative flex-1 pb-2 text-center text-[13px] transition-colors"
        :class="
          leftSidebarSnapshot.activeTab === 'assistants'
            ? 'font-semibold text-gray-900'
            : 'text-gray-500 hover:text-gray-800'
        "
        type="button"
        @click="leftSidebarStore.setActiveTab('assistants')"
      >
        助手
        <span
          v-if="leftSidebarSnapshot.activeTab === 'assistants'"
          class="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-[var(--nc-accent)]"
        />
      </button>
      <button
        class="relative flex-1 pb-2 text-center text-[13px] transition-colors"
        :class="
          leftSidebarSnapshot.activeTab === 'topics'
            ? 'font-semibold text-gray-900'
            : 'text-gray-500 hover:text-gray-800'
        "
        type="button"
        @click="leftSidebarStore.setActiveTab('topics')"
      >
        话题
        <span
          v-if="leftSidebarSnapshot.activeTab === 'topics'"
          class="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-[var(--nc-accent)]"
        />
      </button>
    </div>

    <div class="h-[calc(100%-44px)] overflow-y-auto">
      <LeftSidebarAssistantsTab
        v-if="leftSidebarSnapshot.activeTab === 'assistants'"
        :assistants="leftSidebarSnapshot.assistants"
        :draw-section-label="leftSidebarSnapshot.drawSectionLabel"
        :tools="leftSidebarSnapshot.tools"
        :tools-section-label="leftSidebarSnapshot.toolsSectionLabel"
        @open-settings="assistantStore.openSettings('prompt')"
        @select-assistant="leftSidebarStore.setActiveAssistant"
      />
      <LeftSidebarTopicsTab
        v-else
        :active-topic-id="leftSidebarSnapshot.activeTopicId"
        :topics="leftSidebarSnapshot.topics"
        @add-topic="leftSidebarStore.addTopic"
        @select-topic="leftSidebarStore.setActiveTopic"
        @remove-topic="leftSidebarStore.removeTopic"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import LeftSidebarAssistantsTab from './LeftSidebarAssistantsTab.vue'
import LeftSidebarTopicsTab from './LeftSidebarTopicsTab.vue'
import { useNormalChatAssistantShellStore } from '@renderer/stores/normal-chat/assistant-shell/assistant-shell.store'
import { useNormalChatLeftSidebarShellStore } from '@renderer/stores/normal-chat/left-sidebar-shell/left-sidebar-shell.store'

const assistantStore = useNormalChatAssistantShellStore()
const leftSidebarStore = useNormalChatLeftSidebarShellStore()
const { snapshot: leftSidebarSnapshot } = storeToRefs(leftSidebarStore)

onMounted(() => {
  // 会话管理页独立初始化自身状态组
  void leftSidebarStore.initialize()
})
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
