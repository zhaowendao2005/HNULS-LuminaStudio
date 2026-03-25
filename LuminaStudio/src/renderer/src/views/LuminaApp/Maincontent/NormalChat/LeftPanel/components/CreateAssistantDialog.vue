<template>
  <div
    v-if="workspaceStore.createAssistantDialogOpen"
    class="nc-create-assistant-dialog-a9k2 nc-backdrop-fade-in-a9k2 fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-[1px]"
  >
    <div
      class="nc-dialog-slide-up-a9k2 w-[560px] rounded-2xl bg-white p-6 shadow-[var(--nc-shadow-dialog)]"
    >
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-[18px] font-semibold text-gray-900">创建助手</h2>
          <p class="mt-1 text-[13px] text-gray-500">
            当前 normal-chat 只保留一套默认助手运行模式，点击确认后会直接创建新助手。
          </p>
        </div>
        <button
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          type="button"
          @click="workspaceStore.closeCreateAssistantDialog"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
        <p class="text-[14px] font-medium text-gray-900">默认助手配置</p>
        <p class="mt-2 text-[13px] leading-6 text-gray-600">
          新助手会使用当前系统内置的默认运行配置，并自动创建一个默认话题。后续如需调整行为，请在助手设置中修改。
        </p>
      </div>

      <div class="mt-6 flex items-center justify-end gap-3">
        <button
          class="rounded-lg border border-gray-200 px-4 py-2 text-[14px] text-gray-600 transition-colors hover:bg-gray-50"
          type="button"
          @click="workspaceStore.closeCreateAssistantDialog"
        >
          取消
        </button>
        <button
          class="rounded-lg bg-[var(--nc-accent)] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[var(--nc-accent-hover)]"
          type="button"
          @click="workspaceStore.confirmCreateAssistant"
        >
          创建助手
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const workspaceStore = useNormalChatWorkspaceStore()
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
