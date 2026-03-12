<template>
  <div
    :class="[
      'of-generate-right-panel flex shrink-0 flex-col border-l border-gray-200 bg-white transition-all duration-300 ease-in-out',
      visible
        ? isFullscreen
          ? 'absolute inset-0 z-20 w-full'
          : 'relative w-1/2'
        : 'w-0 overflow-hidden border-l-0 opacity-0'
    ]"
  >
    <template v-if="visible && document">
      <div class="z-20 flex h-full flex-col bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.03)]">
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
              :title="autoApproved ? '关闭自动批准' : '开启自动批准'"
              :class="[
                'rounded border px-2 py-1 text-[10px] font-semibold transition-colors',
                autoApproved
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-violet-200 bg-violet-50 text-violet-700'
              ]"
              @click="$emit('toggle-auto-approved')"
            >
              Auto Approved
            </button>
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

        <div :class="['flex flex-1 overflow-hidden', isFullscreen ? 'flex-row' : 'flex-col']">
          <div
            :class="[
              'flex flex-col bg-white',
              isFullscreen ? 'w-1/2 border-r border-gray-200' : 'h-1/2 border-b border-gray-200'
            ]"
          >
            <div
              class="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-3 py-2"
            >
              <div class="flex min-w-0 items-center gap-2 overflow-hidden">
                <FileText :size="14" class="shrink-0 text-gray-400" />
                <span class="truncate text-xs font-semibold text-gray-700">
                  {{ document.fileName }}
                </span>
                <span class="truncate text-[10px] text-gray-400">● 文档正文实时持久化</span>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto bg-[#fafafa] px-4 py-4">
              <div class="whitespace-pre-wrap font-mono text-[12px] leading-[22px] text-gray-700">
                {{ document.content }}
              </div>
            </div>
          </div>

          <div :class="['flex flex-col bg-white', isFullscreen ? 'w-1/2' : 'h-1/2']">
            <div class="border-b border-gray-100 bg-gray-50/80 px-4 py-2">
              <span
                class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                <RefreshCw :size="12" />
                Copilot
              </span>
            </div>

            <div class="flex-1 space-y-4 overflow-y-auto p-4">
              <div class="text-center text-xs text-gray-400">{{ helperText }}</div>

              <div v-for="message in messages" :key="message.id" class="flex gap-3">
                <div
                  v-if="message.role === 'user'"
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-gray-100"
                >
                  <UserCircle :size="14" class="text-gray-500" />
                </div>
                <div
                  v-else
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-violet-100 bg-violet-50"
                >
                  <Bot :size="14" class="text-violet-600" />
                </div>

                <div
                  :class="[
                    'group w-full rounded-md text-[13px] text-gray-800',
                    message.role === 'user' ? 'rounded-bl-md rounded-r-md bg-gray-50 p-2' : 'p-0.5'
                  ]"
                >
                  <div class="relative rounded-xl" :class="message.role === 'assistant' ? 'pr-2' : ''">
                    {{ message.content }}
                    <span
                      v-if="message.status === 'streaming'"
                      class="ml-1 inline-block h-3 w-1 animate-pulse bg-violet-500 align-middle"
                    ></span>
                    <GenerateMessageActionGroup
                      v-if="message.role === 'assistant' && message.status !== 'streaming'"
                      :message="message"
                    />
                  </div>
                  <div v-if="message.error" class="mt-1 text-[11px] text-rose-500">
                    {{ message.error }}
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-gray-100 p-3">
              <div
                class="relative flex items-center border border-gray-200 bg-gray-50 px-2 py-1.5 transition-all focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-400"
              >
                <input
                  :model-value="copilotInput"
                  type="text"
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
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Bot,
  FileText,
  GitBranch,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  UserCircle,
  X
} from 'lucide-vue-next'
import type { GenerationDocument, GenerationMessage } from '@preload/types'
import GenerateMessageActionGroup from './GenerateMessageActionGroup.vue'
import type { CopilotMode } from './generate-view.types'

const props = defineProps<{
  visible: boolean
  isFullscreen: boolean
  mode: CopilotMode
  sessionTitle: string
  document: GenerationDocument | null
  messages: GenerationMessage[]
  autoApproved: boolean
  copilotInput: string
  isStreaming: boolean
}>()

defineEmits<{
  (e: 'toggle-auto-approved'): void
  (e: 'toggle-fullscreen'): void
  (e: 'close'): void
  (e: 'update:copilot-input', value: string): void
  (e: 'send-copilot-message'): void
}>()

const panelTitle = computed(() => {
  if (props.mode === 'analysis') return '需求分析 Copilot 面板'
  if (props.mode === 'design') return '规划设计 Copilot 面板'
  return '校验 Copilot 面板'
})

const helperText = computed(() => {
  if (props.mode === 'analysis') {
    return '这里是 analysis copilot 对话，目标是验证 AI 对话和数据库持久化链路。'
  }
  if (props.mode === 'design') {
    return '这里是 design copilot 对话，当前只做真实聊天，不做 diff 自动合并。'
  }
  return '这里是 verify copilot 对话，已独立于 design mode。'
})

const inputPlaceholder = computed(() => {
  if (props.mode === 'analysis') return '补充需求分析要求...'
  if (props.mode === 'design') return '补充设计要求...'
  return '补充校验要求...'
})
</script>
