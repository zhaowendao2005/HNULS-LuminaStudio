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
          <h2 class="text-[18px] font-semibold text-gray-900">选择助手模板</h2>
          <p class="mt-1 text-[13px] text-gray-500">
            当前先提供 `base-agent`，后续可以继续在这里扩展更多模板。
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

      <div class="space-y-3">
        <button
          v-for="template in workspaceStore.templates"
          :key="template.key"
          class="w-full rounded-xl border p-4 text-left transition-colors"
          :class="
            template.key === workspaceStore.selectedTemplateKey
              ? 'border-[var(--nc-accent)] bg-emerald-50/50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          "
          type="button"
          @click="workspaceStore.setSelectedTemplateKey(template.key)"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xl">
              {{ template.emoji }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-[15px] font-semibold text-gray-900">{{ template.title }}</span>
                <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                  {{ template.key }}
                </span>
              </div>
              <p class="mt-1 text-[13px] leading-6 text-gray-600">
                {{ template.description }}
              </p>
            </div>
          </div>
        </button>
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
