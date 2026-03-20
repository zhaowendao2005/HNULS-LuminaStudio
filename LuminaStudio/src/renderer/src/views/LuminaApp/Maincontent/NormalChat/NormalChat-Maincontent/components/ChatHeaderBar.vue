<template>
  <header
    class="nc-chat-header-a9k2 flex items-center justify-between border-b border-[var(--nc-border-soft)] bg-[var(--nc-panel-bg)] px-4 py-2.5"
  >
    <div class="flex items-center gap-1">
      <button
        class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        type="button"
        @click="layoutStore.toggleLeftCollapsed"
      >
        <PanelLeft class="h-5 w-5 stroke-[1.5]" />
      </button>

      <div class="ml-2 flex items-center space-x-2">
        <button
          class="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 transition-colors hover:bg-gray-100"
          type="button"
          @click="workspaceStore.openAssistantSettings('prompt')"
        >
          <span class="nc-default-assistant-avatar-a9k2 text-sm">
            {{ currentAssistant?.emoji ?? '🤖' }}
          </span>
          <span class="text-[14px] font-medium text-gray-700">
            {{ currentAssistant?.name ?? '未选择助手' }}
          </span>
        </button>

        <ChevronRight class="h-4 w-4 text-gray-300" />

        <div class="flex items-center gap-1.5 px-2 py-1">
          <span class="nc-qwen-icon-a9k2">
            <svg
              fill="none"
              height="12"
              viewBox="0 0 24 24"
              width="12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L22 7.8V16.2L12 22L2 16.2V7.8L12 2ZM12 4.3L4.5 8.6V15.4L12 19.7L19.5 15.4V8.6L12 4.3Z"
                fill="white"
              />
              <circle cx="12" cy="12" fill="white" r="3" />
            </svg>
          </span>
          <span class="text-[14px] font-medium text-gray-600">
            {{ currentAssistantTemplate?.title ?? '未选择模板' }}
          </span>
          <ChevronDown class="ml-1 h-3.5 w-3.5 text-gray-400" />
        </div>
      </div>
    </div>

    <div class="flex items-center gap-1 text-gray-500">
      <button
        class="rounded-md p-1.5 transition-colors hover:bg-gray-100"
        type="button"
        @click="workspaceStore.openAssistantSettings('model')"
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
import {
  ChevronDown,
  ChevronRight,
  PanelLeft,
  Search,
  Settings2,
  SplitSquareHorizontal
} from 'lucide-vue-next'
import { useNormalChatLayoutShellStore } from '@renderer/stores/normal-chat/layout-shell/layout-shell.store'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const layoutStore = useNormalChatLayoutShellStore()
const workspaceStore = useNormalChatWorkspaceStore()

const { currentAssistant, currentAssistantTemplate } = storeToRefs(workspaceStore)
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
