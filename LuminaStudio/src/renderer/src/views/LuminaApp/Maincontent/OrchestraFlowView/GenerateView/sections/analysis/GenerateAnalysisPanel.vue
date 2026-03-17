<template>
  <div class="of-generate-analysis mx-auto flex h-full max-w-4xl flex-col">
    <div class="border-b border-gray-100 px-6 py-4">
      <div class="flex items-center justify-between gap-4 overflow-hidden">
        <div class="min-w-0 overflow-hidden">
          <div class="truncate text-[13px] font-semibold text-gray-800">{{ sessionTitle }}</div>
          <div class="mt-1 truncate text-xs text-gray-500">{{ sessionSummary }}</div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span class="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
            当前阶段：{{ currentSessionStageLabel }}
          </span>
          <button
            type="button"
            title="打开 copilot"
            class="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-800"
            @click="$emit('open-copilot')"
          >
            <MessageSquare :size="15" />
          </button>
          <button
            type="button"
            title="切换会话"
            class="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-800"
            @click="$emit('open-sessions')"
          >
            <FolderKanban :size="15" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 space-y-6 overflow-y-auto px-6 py-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          当前需求分析文档
        </div>
        <textarea
          class="min-h-[220px] w-full resize-none border-none bg-transparent font-mono text-[12px] leading-6 text-gray-800 outline-none"
          :value="document.content"
          @input="$emit('update:document', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </div>

      <div v-for="entry in decoratedMessages" :key="entry.message.id" class="flex gap-4">
        <div
          v-if="entry.message.role === 'user'"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100"
        >
          <UserCircle :size="18" class="text-gray-500" />
        </div>
        <div
          v-else
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-cyan-100 bg-cyan-50"
        >
          <Bot :size="18" class="text-cyan-600" />
        </div>

        <div class="w-full space-y-1.5 pt-1.5">
          <div class="text-xs font-semibold text-gray-800">
            {{ entry.message.role === 'user' ? 'User' : 'Lumina Agent' }}
          </div>
          <div
            class="group relative rounded-xl bg-white px-4 py-3 text-[13px] leading-relaxed text-gray-800"
          >
            <GenerateMessageActionToolbar
              @copy="handleCopyMessage(entry.message)"
              @inspect="openMessageDetail(entry.message)"
            />
            <div v-if="entry.planningBlock" class="relative">
              <GenerateRequirementPlanningBlock :block="entry.planningBlock" />
              <!--
                规划设计：
                - 这个按钮位于“需求规划输出块”右下角
                - 点击后，把这条规划输出（message.id）作为 planningSourceMessageId，进入规划设计稿面板
              -->
              <div class="mt-3 flex justify-end">
                <button
                  type="button"
                  class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  @click="$emit('start-design', entry.message.id)"
                >
                  规划设计
                </button>
              </div>
            </div>
            <template v-else>
              {{ entry.message.content || '...' }}
              <span
                v-if="entry.message.status === 'streaming'"
                class="ml-1 inline-block h-3 w-1 animate-pulse bg-cyan-500 align-middle"
              ></span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="shrink-0 border-t border-gray-100 bg-white p-4">
      <div
        class="relative flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400"
      >
        <input
          :value="analysisInput"
          type="text"
          :disabled="isAnalysisStreaming"
          :placeholder="analysisInputPlaceholder"
          class="flex-1 border-none bg-transparent text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none"
          @input="$emit('update:analysis-input', ($event.target as HTMLInputElement).value)"
          @keydown.enter="$emit('send-analysis')"
        />
        <button
          type="button"
          class="p-1.5 text-gray-400 transition-colors hover:text-cyan-600 disabled:cursor-not-allowed disabled:text-gray-300"
          :disabled="isAnalysisStreaming || !analysisInput.trim()"
          @click="$emit('send-analysis')"
        >
          <Send :size="16" />
        </button>
      </div>
    </div>

    <GenerateMessageDetailPanel
      :visible="messageDetail.visible"
      mode="analysis"
      :message="messageDetail.message"
      :related-user-message="messageDetail.relatedUserMessage"
      :run="messageDetail.run"
      @close="closeMessageDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Bot, FolderKanban, MessageSquare, Send, UserCircle } from 'lucide-vue-next'
import type { GenerationAnalysisDocument, GenerationMessage } from '@preload/types'
import {
  getRequirementPlanningBlock,
  type RequirementPlanningBlockViewModel
} from '@renderer/stores/orchestraflow/generation-editor/generation-editor.types'
import { useGenerationRunInspectorStore } from '@renderer/stores/orchestraflow/generation-editor/inspector/run-inspector.store'
import type { RunInspectorRecord } from '@renderer/stores/orchestraflow/generation-editor/inspector/run-inspector.types'
import GenerateMessageActionToolbar from '../../overlays/message-detail/GenerateMessageActionToolbar.vue'
import GenerateMessageDetailPanel from '../../overlays/message-detail/GenerateMessageDetailPanel.vue'
import GenerateRequirementPlanningBlock from './GenerateRequirementPlanningBlock.vue'

const props = defineProps<{
  sessionTitle: string
  sessionSummary: string
  currentSessionStageLabel: string
  document: GenerationAnalysisDocument
  messages: GenerationMessage[]
  analysisInput: string
  isAnalysisStreaming: boolean
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

defineEmits<{
  (e: 'open-sessions'): void
  (e: 'open-copilot'): void
  (e: 'start-design', messageId: string): void
  (e: 'update:document', value: string): void
  (e: 'update:analysis-input', value: string): void
  (e: 'send-analysis'): void
}>()

const analysisInputPlaceholder = computed(() => {
  return props.isAnalysisStreaming ? '消息已发出，等待 AI 回复中...' : '输入补充需求或修改意见...'
})

// 这里先把 message 和“是否可识别成需求规划块”整理好，模板层保持简单。
const decoratedMessages = computed<
  Array<{ message: GenerationMessage; planningBlock: RequirementPlanningBlockViewModel | null }>
>(() => {
  return props.messages.map((message) => ({
    message,
    planningBlock: getRequirementPlanningBlock(message)
  }))
})

function handleCopyMessage(message: GenerationMessage): void {
  void navigator.clipboard.writeText(message.content || '')
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
