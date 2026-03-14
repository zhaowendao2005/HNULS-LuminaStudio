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
            class="group relative rounded-xl"
            :class="entry.message.role === 'assistant' ? 'pr-2' : ''"
          >
            <div class="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800">
              {{ entry.message.content }}
              <span
                v-if="entry.message.status === 'streaming'"
                class="ml-1 inline-block h-3 w-1 animate-pulse bg-cyan-500 align-middle"
              ></span>
            </div>
            <GeneratePlanningBlock
              v-if="entry.planningBlock"
              :block="entry.planningBlock"
              :existing-design-count="entry.existingDesignCount"
              @use-copilot="$emit('open-planning-copilot', entry.message.id)"
              @create-design="$emit('create-planning-design', entry.message.id)"
              @open-designs="$emit('open-existing-planning-designs', entry.message.id)"
            />
            <GenerateMessageActionGroup
              v-if="entry.message.role === 'assistant'"
              :message="entry.message"
            />
          </div>
          <div v-if="entry.message.error" class="text-[11px] text-rose-500">
            {{ entry.message.error }}
          </div>
        </div>
      </div>
    </div>

    <div class="shrink-0 border-t border-gray-100 bg-white p-4">
      <div
        class="relative flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400"
      >
        <input
          :model-value="analysisInput"
          type="text"
          placeholder="输入补充需求或修改意见..."
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bot, FolderKanban, MessageSquare, Send, UserCircle } from 'lucide-vue-next'
import type {
  GenerationDesignDocument,
  GenerationMessage,
  GenerationPlanningDocument
} from '@preload/types'
import { getGenerationPlanningBlock } from '@renderer/stores/orchestraflow/generation-editor/generation-editor.types'
import GenerateMessageActionGroup from './GenerateMessageActionGroup.vue'
import GeneratePlanningBlock from './GeneratePlanningBlock.vue'

const props = defineProps<{
  sessionTitle: string
  sessionSummary: string
  currentSessionStageLabel: string
  messages: GenerationMessage[]
  planningDocuments: Record<string, GenerationPlanningDocument>
  designDocuments: Record<string, GenerationDesignDocument>
  analysisInput: string
  isAnalysisStreaming: boolean
}>()

defineEmits<{
  (e: 'open-sessions'): void
  (e: 'open-copilot'): void
  (e: 'open-planning-copilot', messageId: string): void
  (e: 'create-planning-design', messageId: string): void
  (e: 'open-existing-planning-designs', messageId: string): void
  (e: 'update:analysis-input', value: string): void
  (e: 'send-analysis'): void
}>()

/**
 * 这里把普通文本消息和 planning block 一起整理好，
 * 模板层就不用每次都现场 parse metaJson 了。
 */
const decoratedMessages = computed(() => {
  return props.messages.map((message) => {
    const planningBlock = getGenerationPlanningBlock(message, props.planningDocuments)
    const existingDesignCount = planningBlock?.documentId
      ? Object.values(props.designDocuments).filter(
          (document) => document.planningDocumentId === planningBlock.documentId
        ).length
      : 0

    return {
      message,
      planningBlock,
      existingDesignCount
    }
  })
})
</script>
