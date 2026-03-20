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
        @click="setActiveTab('assistants')"
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
        @click="setActiveTab('topics')"
      >
        话题
        <span
          v-if="leftSidebarSnapshot.activeTab === 'topics'"
          class="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-[var(--nc-accent)]"
        />
      </button>
    </div>

    <div class="h-[calc(100%-44px)] overflow-y-auto">
      <LeftSidebarAssistantsTab v-if="leftSidebarSnapshot.activeTab === 'assistants'" />
      <LeftSidebarTopicsTab
        v-else
        :active-topic-id="workspaceSnapshot.activeTopicId"
        :editing-topic-id="workspaceStore.editingTopicId"
        :rename-draft="workspaceStore.topicRenameDraft"
        :topics="workspaceStore.currentTopics"
        @add-topic="workspaceStore.createTopic"
        @cancel-rename="workspaceStore.cancelTopicRename"
        @commit-rename="workspaceStore.commitTopicRename"
        @remove-topic="workspaceStore.deleteTopic"
        @select-topic="workspaceStore.setActiveTopic"
        @start-rename="workspaceStore.startTopicRename"
        @update:rename-draft="workspaceStore.setTopicRenameDraft"
      />
    </div>
    <CreateAssistantDialog />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import LeftSidebarAssistantsTab from './LeftSidebarAssistantsTab.vue'
import LeftSidebarTopicsTab from './LeftSidebarTopicsTab.vue'
import CreateAssistantDialog from './CreateAssistantDialog.vue'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

type LeftSidebarTab = 'assistants' | 'topics'

const workspaceStore = useNormalChatWorkspaceStore()
const { snapshot: workspaceSnapshot } = storeToRefs(workspaceStore)

const leftSidebarSnapshot = ref<{ activeTab: LeftSidebarTab }>({
  activeTab: 'assistants'
})

const setActiveTab = (value: LeftSidebarTab) => {
  leftSidebarSnapshot.value.activeTab = value
}
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
