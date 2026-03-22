<template>
  <div
    v-if="workspaceStore.assistantSettingsOpen"
    class="nc-assistant-settings-modal-a9k2 nc-backdrop-fade-in-a9k2 fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-[1px]"
  >
    <div
      class="nc-dialog-slide-up-a9k2 flex h-[680px] w-[900px] flex-col overflow-hidden rounded-xl bg-white shadow-[var(--nc-shadow-dialog)]"
    >
      <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div class="min-w-0">
          <h2 class="truncate text-[16px] font-semibold text-gray-900">
            {{
              workspaceStore.promptEditorScope === 'assistant'
                ? (workspaceStore.currentAssistant?.name ?? '未选择助手')
                : (workspaceStore.currentTopic?.title ?? '当前话题提示词')
            }}
          </h2>
          <p class="mt-1 text-[12px] text-gray-500">
            {{
              workspaceStore.promptEditorScope === 'assistant'
                ? '这里修改的是助手自身的配置。'
                : '这里修改的是当前话题的提示词覆盖。'
            }}
          </p>
        </div>

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
          <template v-if="showAssistantBasicPage">
            <div class="space-y-6">
              <div>
                <label class="mb-2 block text-[14px] font-semibold text-gray-900">名称</label>
                <div class="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-1">
                  <div
                    class="ml-1 flex h-8 w-8 items-center justify-center rounded border border-pink-100 bg-pink-50"
                  >
                    {{ workspaceStore.currentAssistant?.emoji ?? '🧠' }}
                  </div>
                  <input
                    v-model="assistantNameModel"
                    class="flex-1 border-none bg-transparent px-2 text-[14px] text-gray-800 outline-none"
                    type="text"
                  />
                </div>
              </div>

              <div class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <h3 class="text-[14px] font-semibold text-gray-900">完整会话保存</h3>
                    <p class="mt-1 text-[13px] leading-6 text-gray-500">
                      开启后，系统会保存这位助手的完整 turn 记录、原始输入上下文和原始响应。
                    </p>
                  </div>

                  <button
                    class="relative mt-0.5 inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200"
                    :class="
                      assistantSaveFullConversationModel
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-gray-300 bg-gray-200'
                    "
                    :aria-checked="assistantSaveFullConversationModel"
                    aria-label="完整会话保存开关"
                    role="switch"
                    type="button"
                    @click="toggleSaveFullConversation"
                  >
                    <span
                      class="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                      :class="
                        assistantSaveFullConversationModel ? 'translate-x-5' : 'translate-x-0'
                      "
                    />
                  </button>
                </div>

                <div class="mt-4 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2">
                  <p class="text-[12px] leading-5 text-gray-500">
                    当前状态：
                    <span
                      class="font-medium"
                      :class="
                        assistantSaveFullConversationModel ? 'text-emerald-700' : 'text-gray-600'
                      "
                    >
                      {{ assistantSaveFullConversationModel ? '已开启' : '已关闭' }}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </template>

          <template
            v-else-if="
              workspaceStore.promptEditorScope === 'topic' ||
              workspaceStore.activeSettingsTab === 'prompt'
            "
          >
            <div v-if="workspaceStore.promptEditorScope === 'assistant'" class="mb-6">
              <div class="mb-2 flex items-center gap-1.5">
                <label class="text-[14px] font-semibold text-gray-900">当前助手提示词</label>
                <HelpCircle class="h-3.5 w-3.5 cursor-help text-gray-400" />
              </div>
              <p class="text-[13px] leading-6 text-gray-500">
                这里修改的是助手默认 system prompt。当前话题没有单独覆盖时，会继承这里的内容。
              </p>
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
                当前话题未单独配置时，会直接继承助手默认提示词。这里显示的是当前生效内容。
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
                  <X class="h-4 w-4" />
                  保存提示词
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
import { computed, watch } from 'vue'
import { HelpCircle, X } from 'lucide-vue-next'
import { useNormalChatWorkspaceStore } from '@renderer/stores/normal-chat/workspace/workspace.store'

const workspaceStore = useNormalChatWorkspaceStore()

const showAssistantBasicPage = computed(
  () =>
    workspaceStore.promptEditorScope === 'assistant' && workspaceStore.activeSettingsTab === 'basic'
)

const assistantNameModel = computed({
  get: () => workspaceStore.assistantNameDraft,
  set: (value: string) => {
    workspaceStore.setAssistantNameDraft(value)
  }
})

const assistantSaveFullConversationModel = computed({
  get: () => workspaceStore.assistantSaveFullConversationDraft,
  set: (value: boolean) => {
    workspaceStore.setAssistantSaveFullConversationDraft(value)
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

function toggleSaveFullConversation(): void {
  assistantSaveFullConversationModel.value = !assistantSaveFullConversationModel.value
}

watch(
  () => assistantNameModel.value,
  () => {
    if (!showAssistantBasicPage.value) {
      return
    }

    void workspaceStore.updateAssistantBasicSettings()
  }
)

watch(
  () => assistantSaveFullConversationModel.value,
  () => {
    if (!showAssistantBasicPage.value) {
      return
    }

    void workspaceStore.updateAssistantBasicSettings()
  }
)
</script>

<style scoped lang="scss">
@use '../../normal-chat-theme.scss' as *;
</style>
