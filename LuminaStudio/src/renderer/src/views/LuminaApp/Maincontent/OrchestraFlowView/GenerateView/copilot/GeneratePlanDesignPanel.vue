<template>
  <div
    :class="[
      'of-generate-right-panel flex h-full min-h-0 shrink-0 flex-col border-l border-gray-200 bg-white transition-all duration-300 ease-in-out',
      visible
        ? isFullscreen
          ? 'absolute inset-0 z-20 w-full'
          : 'relative w-1/2'
        : 'w-0 overflow-hidden border-l-0 opacity-0'
    ]"
  >
    <template v-if="visible">
      <div class="z-20 flex h-full min-h-0 flex-col bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.03)]">
        <div
          class="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4"
        >
          <div class="flex min-w-0 items-center gap-2 overflow-hidden">
            <GitBranch :size="16" class="shrink-0 text-gray-400" />
            <h3 class="truncate text-[13px] font-semibold text-gray-800">{{ panelTitle }}</h3>
            <span class="truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
              {{ sessionTitle }}
            </span>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <button
              type="button"
              :title="isFullscreen ? '退出全屏' : '全屏'"
              class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              @click="$emit('toggle-fullscreen')"
            >
              <Minimize2 v-if="isFullscreen" :size="14" />
              <Maximize2 v-else :size="14" />
            </button>
            <div class="mx-1 h-3 w-px bg-gray-200"></div>
            <button
              type="button"
              class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              @click="$emit('close')"
            >
              <X :size="16" />
            </button>
          </div>
        </div>

        <div
          v-if="showDocumentPreview"
          :class="['flex flex-1 overflow-hidden', isFullscreen ? 'flex-row' : 'flex-col']"
        >
          <div
            :class="[
              'flex min-h-0 flex-col bg-white',
              isFullscreen ? 'w-1/2 border-r border-gray-200' : 'h-1/2 border-b border-gray-200'
            ]"
          >
            <div
              class="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-3 py-2"
            >
              <div class="flex min-w-0 items-center gap-2 overflow-hidden">
                <FileText :size="14" class="shrink-0 text-gray-400" />
                <span class="truncate text-xs font-semibold text-gray-700">
                  {{ previewTitle }}
                </span>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto bg-[#fafafa] px-4 py-4">
              <pre class="whitespace-pre-wrap font-mono text-[12px] leading-[22px] text-gray-700">{{
                previewContent || '当前没有可展示的正文。'
              }}</pre>
            </div>
          </div>

          <div :class="['flex min-h-0 flex-col bg-white', isFullscreen ? 'w-1/2' : 'h-1/2']">
            <div class="border-b border-gray-100 bg-gray-50/80 px-4 py-2">
              <span
                class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                <RefreshCw :size="12" />
                Copilot
              </span>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              <div class="mb-4 text-center text-xs text-gray-400">{{ helperText }}</div>
              <div v-if="messages.length === 0" class="flex h-full items-center justify-center">
                <div
                  class="max-w-xs rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center"
                >
                  <div class="text-sm font-semibold text-slate-700">当前还没有消息</div>
                  <div class="mt-2 text-[12px] leading-6 text-slate-500">
                    这里会展示当前阶段的 Copilot 对话记录。
                  </div>
                </div>
              </div>

              <div v-else class="space-y-4">
                <GenerateCopilotMessageBlock
                  v-for="message in messages"
                  :key="message.id"
                  :message="message"
                  @copy="handleCopyMessage(message)"
                  @inspect="openMessageDetail(message)"
                  @abort="handleAbortMessage(message)"
                />
              </div>
            </div>

            <div class="border-t border-gray-100 p-3">
              <div
                class="relative flex items-center border border-gray-200 bg-gray-50 px-2 py-1.5 transition-all focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-400"
              >
                <input
                  :value="copilotInput"
                  type="text"
                  :disabled="isStreaming"
                  :placeholder="inputPlaceholder"
                  class="flex-1 border-none bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                  @input="$emit('update:copilot-input', ($event.target as HTMLInputElement).value)"
                  @keydown.enter="$emit('send-copilot-message')"
                />
                <button
                  type="button"
                  class="p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
                  :disabled="!copilotInput.trim() || isStreaming"
                  @click="$emit('send-copilot-message')"
                >
                  <Send :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex min-h-0 flex-1 flex-col">
          <div class="border-b border-gray-100 bg-gray-50/80 px-4 py-2">
            <span
              class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              <RefreshCw :size="12" />
              Copilot
            </span>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div class="mb-4 text-center text-xs text-gray-400">{{ helperText }}</div>

            <div v-if="messages.length === 0" class="flex h-full items-center justify-center">
              <div
                class="max-w-xs rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center"
              >
                <div class="text-sm font-semibold text-slate-700">当前还没有消息</div>
                <div class="mt-2 text-[12px] leading-6 text-slate-500">
                  这里会展示当前阶段的 Copilot 对话记录。
                </div>
              </div>
            </div>

            <div v-else class="space-y-4">
              <GenerateCopilotMessageBlock
                v-for="message in messages"
                :key="message.id"
                :message="message"
                @copy="handleCopyMessage(message)"
                @inspect="openMessageDetail(message)"
                @abort="handleAbortMessage(message)"
              />
            </div>
          </div>

          <div class="border-t border-gray-100 p-3">
            <div
              class="relative flex items-center border border-gray-200 bg-gray-50 px-2 py-1.5 transition-all focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-400"
            >
              <input
                :value="copilotInput"
                type="text"
                :disabled="isStreaming"
                :placeholder="inputPlaceholder"
                class="flex-1 border-none bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                @input="$emit('update:copilot-input', ($event.target as HTMLInputElement).value)"
                @keydown.enter="$emit('send-copilot-message')"
              />
              <button
                type="button"
                class="p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
                :disabled="!copilotInput.trim() || isStreaming"
                @click="$emit('send-copilot-message')"
              >
                <Send :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <GenerateMessageDetailPanel
      :visible="messageDetail.visible"
      :mode="mode"
      :message="messageDetail.message"
      :related-user-message="messageDetail.relatedUserMessage"
      :run="messageDetail.run"
      @close="closeMessageDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { FileText, GitBranch, Maximize2, Minimize2, RefreshCw, Send, X } from 'lucide-vue-next'
import type { GenerationMessage } from '@preload/types'
import { useGenerationRunInspectorStore } from '@renderer/stores/orchestraflow/generation-editor/inspector/run-inspector.store'
import type { RunInspectorRecord } from '@renderer/stores/orchestraflow/generation-editor/inspector/run-inspector.types'
import type { CopilotMode } from '../generate-view.types'
import GenerateMessageDetailPanel from '../overlays/message-detail/GenerateMessageDetailPanel.vue'
import GenerateCopilotMessageBlock from './GenerateCopilotMessageBlock.vue'

const props = defineProps<{
  visible: boolean
  isFullscreen: boolean
  mode: CopilotMode
  sessionTitle: string
  previewTitle: string
  previewContent: string
  messages: GenerationMessage[]
  copilotInput: string
  isStreaming: boolean
}>()

const inspectorStore = useGenerationRunInspectorStore()
const messageDetail = reactive<{
  visible: boolean
  message: GenerationMessage | null
  relatedUserMessage: GenerationMessage | null
  run: RunInspectorRecord | null
}>({
  visible: false,
  message: null,
  relatedUserMessage: null,
  run: null
})

const emit = defineEmits<{
  (e: 'toggle-fullscreen'): void
  (e: 'close'): void
  (e: 'update:copilot-input', value: string): void
  (e: 'send-copilot-message'): void
  (e: 'abort-message', message: GenerationMessage): void
}>()

const panelTitle = computed(() => {
  return props.mode === 'analysis' ? '需求分析 Copilot 面板' : '规划设计 Copilot 面板'
})

const helperText = computed(() => {
  return props.mode === 'analysis'
    ? '这里是 analysis chat 对话支路，用来和用户讨论方案，确认后再进入正式规划输出。'
    : '这里是 design copilot 面板，负责承接当前新主链里的 design-planner。'
})

const inputPlaceholder = computed(() => {
  if (props.isStreaming) return '消息已发出，等待 AI 回复中...'
  return props.mode === 'analysis'
    ? '继续讨论方案，或直接要求定稿输出计划...'
    : '补充设计约束或修订要求...'
})

const showDocumentPreview = computed(() => props.mode === 'analysis')

function handleCopyMessage(message: GenerationMessage): void {
  void navigator.clipboard.writeText(message.content || '')
}

function handleAbortMessage(message: GenerationMessage): void {
  emit('abort-message', message)
}

function findRelatedUserMessage(message: GenerationMessage): GenerationMessage | null {
  const index = props.messages.findIndex((item) => item.id === message.id)
  if (index < 0) return null
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (props.messages[cursor]?.role === 'user') {
      return props.messages[cursor]
    }
  }
  return null
}

function openMessageDetail(message: GenerationMessage): void {
  messageDetail.visible = true
  messageDetail.message = message
  messageDetail.relatedUserMessage = findRelatedUserMessage(message)
  messageDetail.run =
    inspectorStore.findRunByMessageId(message.id) ||
    inspectorStore.findRunByRequestId(message.requestId)
}

function closeMessageDetail(): void {
  messageDetail.visible = false
}
</script>
