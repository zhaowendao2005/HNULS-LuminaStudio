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
      <div v-for="message in messages" :key="message.id" class="flex gap-4">
        <div
          v-if="message.role === 'user'"
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
            {{ message.role === 'user' ? 'User' : 'Lumina Agent' }}
          </div>
          <div class="text-[13px] leading-relaxed text-gray-800">
            {{ message.content }}
            <span
              v-if="message.status === 'streaming'"
              class="ml-1 inline-block h-3 w-1 animate-pulse bg-cyan-500 align-middle"
            ></span>
          </div>
          <div v-if="message.error" class="text-[11px] text-rose-500">{{ message.error }}</div>
        </div>
      </div>

      <div class="rounded border border-dashed border-gray-200 bg-gray-50/60 px-4 py-3">
        <div class="text-xs font-semibold text-gray-600">需求分析文档</div>
        <div class="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-gray-700">
          {{ analysisDocumentContent }}
        </div>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="rounded-sm bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            @click="$emit('enter-design')"
          >
            进入规划设计页
          </button>
          <button
            type="button"
            class="rounded-sm bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200"
            @click="$emit('open-copilot')"
          >
            打开 copilot
          </button>
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
import { Bot, FolderKanban, MessageSquare, Send, UserCircle } from 'lucide-vue-next'
import type { GenerationMessage } from '@preload/types'

defineProps<{
  sessionTitle: string
  sessionSummary: string
  currentSessionStageLabel: string
  analysisDocumentContent: string
  messages: GenerationMessage[]
  analysisInput: string
  isAnalysisStreaming: boolean
}>()

defineEmits<{
  (e: 'open-sessions'): void
  (e: 'open-copilot'): void
  (e: 'enter-design'): void
  (e: 'update:analysis-input', value: string): void
  (e: 'send-analysis'): void
}>()
</script>
