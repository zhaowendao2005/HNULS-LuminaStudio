<template>
  <div
    v-if="workspaceStore.assistantSettingsOpen"
    class="nc-assistant-settings-modal-a9k2 nc-backdrop-fade-in-a9k2 fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-[1px]"
  >
    <div
      class="nc-dialog-slide-up-a9k2 flex h-[680px] w-[900px] flex-col overflow-hidden rounded-xl bg-white shadow-[var(--nc-shadow-dialog)]"
    >
      <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 class="text-[16px] font-semibold text-gray-900">
          {{
            workspaceStore.promptEditorScope === 'assistant'
              ? (workspaceStore.currentAssistant?.name ?? '未选择助手')
              : (workspaceStore.currentTopic?.title ?? '当前话题提示词')
          }}
        </h2>
        <button
          class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          type="button"
          @click="workspaceStore.closeAssistantSettings"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <aside
          v-if="workspaceStore.promptEditorScope === 'assistant'"
          class="flex w-[180px] flex-col gap-1 border-r border-gray-100 bg-[#fafafa] py-3"
        >
          <button
            v-for="item in workspaceStore.settingsNavItems"
            :key="item.id"
            class="mx-3 rounded-lg px-4 py-2.5 text-left text-[14px] transition-colors"
            :class="
              item.id === workspaceStore.activeSettingsTab
                ? 'bg-gray-200/70 font-medium text-gray-900'
                : 'text-gray-600 hover:bg-gray-200/40'
            "
            type="button"
            @click="workspaceStore.setActiveSettingsTab(item.id)"
          >
            {{ item.label }}
          </button>
        </aside>

        <section class="flex flex-1 flex-col overflow-y-auto bg-white p-6">
          <template
            v-if="
              workspaceStore.promptEditorScope === 'topic' ||
              workspaceStore.activeSettingsTab === 'prompt'
            "
          >
            <div v-if="workspaceStore.promptEditorScope === 'assistant'" class="mb-6">
              <label class="mb-2 block text-[14px] font-semibold text-gray-900">名称</label>
              <div class="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-1">
                <div
                  class="ml-1 flex h-8 w-8 items-center justify-center rounded border border-pink-100 bg-pink-50"
                >
                  {{ workspaceStore.currentAssistant?.emoji ?? '🤖' }}
                </div>
                <input
                  v-model="assistantNameModel"
                  class="flex-1 border-none bg-transparent px-2 text-[14px] text-gray-800 outline-none"
                  type="text"
                />
              </div>
            </div>

            <div class="flex min-h-0 flex-1 flex-col">
              <div class="mb-2 flex items-center gap-1.5">
                <label class="text-[14px] font-semibold text-gray-900">
                  {{ workspaceStore.currentSettingsLabel }}
                </label>
                <HelpCircle class="h-3.5 w-3.5 cursor-help text-gray-400" />
              </div>
              <p
                v-if="workspaceStore.promptEditorScope === 'topic'"
                class="mb-3 text-[13px] leading-6 text-gray-500"
              >
                当前话题未单独配置时，会直接继承助手默认提示词。现在这里显示的是当前生效内容。
              </p>
              <textarea
                v-model="promptTextModel"
                class="flex-1 w-full resize-none rounded-lg border border-gray-200 bg-[#fafafa] p-4 font-mono text-[14px] outline-none focus:ring-1 focus:ring-emerald-500/50"
                :class="workspaceStore.promptEditorIsInherited ? 'text-gray-400' : 'text-gray-700'"
                :placeholder="
                  workspaceStore.promptEditorScope === 'assistant'
                    ? '在这里输入助手默认 system prompt...'
                    : '在这里输入当前话题的 system prompt...'
                "
              />

              <div class="mt-4 flex items-center justify-between">
                <span class="text-[13px] text-gray-500">Tokens: {{ promptTokenCount }}</span>
                <button
                  class="flex items-center gap-1.5 rounded-lg bg-[var(--nc-accent)] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[var(--nc-accent-hover)]"
                  type="button"
                  @click="workspaceStore.savePromptSettings"
                >
                  <Save class="h-4 w-4" />
                  保存
                </button>
              </div>
            </div>
          </template>

          <div v-else class="flex h-full items-center justify-center text-gray-400">
            {{ workspaceStore.currentSettingsLabel }} 分页开发中...
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HelpCircle, Save, X } from 'lucide-vue-next'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const workspaceStore = useNormalChatWorkspaceStore()

const assistantNameModel = computed({
  get: () => workspaceStore.assistantNameDraft,
  set: (value: string) => {
    workspaceStore.setAssistantNameDraft(value)
  }
})

const promptTextModel = computed({
  get: () =>
    workspaceStore.promptEditorScope === 'assistant'
      ? workspaceStore.assistantDefaultPromptDraft
      : workspaceStore.topicPromptDraft,
  set: (value: string) => {
    if (workspaceStore.promptEditorScope === 'assistant') {
      workspaceStore.setAssistantDefaultPromptDraft(value)
      return
    }

    workspaceStore.setTopicPromptDraft(value)
  }
})

const promptTokenCount = computed(() => {
  const content = promptTextModel.value.trim()
  if (!content) {
    return 0
  }

  return content.split(/\s+/).length
})
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
