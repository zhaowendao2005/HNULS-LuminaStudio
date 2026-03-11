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
    <template v-if="visible">
      <div class="z-20 flex h-full flex-col bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.03)]">
        <div
          class="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4"
        >
          <div class="flex items-center gap-2">
            <GitBranch :size="16" class="text-gray-400" />
            <h3 class="text-[13px] font-semibold text-gray-800">{{ panelTitle }}</h3>
            <span class="ml-2 rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] text-cyan-600">
              {{ session.title }}
            </span>
          </div>
          <div class="flex items-center gap-1">
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
              class="rounded p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
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
              <div class="flex items-center gap-2">
                <FileText :size="14" class="text-gray-400" />
                <span class="text-xs font-semibold text-gray-700">{{ document.fileName }}</span>
                <span class="ml-1 text-[10px] text-gray-400">● 已自动合并最新修改</span>
              </div>
              <span
                class="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
              >
                Auto Approved
              </span>
            </div>

            <div class="flex-1 overflow-y-auto bg-[#fafafa]">
              <div class="min-w-max pb-4 font-mono text-[12px] leading-[22px]">
                <div
                  v-for="(line, index) in document.diffLines"
                  :key="`${line.type}-${index}`"
                  :class="[
                    'group flex',
                    line.type === 'added'
                      ? 'bg-emerald-50/60'
                      : line.type === 'removed'
                        ? 'bg-rose-50/60'
                        : 'hover:bg-gray-100/50'
                  ]"
                >
                  <div
                    :class="[
                      'w-10 shrink-0 select-none border-r pr-3 text-right',
                      line.type === 'added'
                        ? 'border-emerald-200/50 bg-emerald-100/30 text-emerald-400'
                        : line.type === 'removed'
                          ? 'border-rose-200/50 bg-rose-100/30 text-rose-400'
                          : 'border-gray-100 bg-gray-50/50 text-gray-300 group-hover:border-gray-200 group-hover:bg-gray-100/80'
                    ]"
                  >
                    {{ line.num ?? '\u00A0' }}
                  </div>
                  <div
                    :class="[
                      'whitespace-pre pl-4',
                      line.type === 'added'
                        ? 'text-emerald-800'
                        : line.type === 'removed'
                          ? 'text-rose-700/80 line-through decoration-rose-400/50'
                          : 'text-gray-700'
                    ]"
                  >
                    {{ line.text }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div :class="['flex flex-col bg-white', isFullscreen ? 'w-1/2' : 'h-1/2']">
            <div class="border-b border-gray-100 bg-gray-50/80 px-4 py-2">
              <span
                class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                <RefreshCw :size="12" />
                Auto Copilot
              </span>
            </div>

            <div class="flex-1 space-y-4 overflow-y-auto p-4">
              <div class="text-center text-xs text-gray-400">{{ helperText }}</div>

              <div v-for="message in document.agentMessages" :key="message.id" class="flex gap-3">
                <div
                  v-if="message.role === 'user'"
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-gray-100"
                >
                  <UserCircle :size="14" class="text-gray-500" />
                </div>
                <div
                  v-else-if="message.role === 'assistant'"
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-violet-100 bg-violet-50"
                >
                  <Bot :size="14" class="text-violet-600" />
                </div>
                <div
                  v-else
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-amber-100 bg-amber-50"
                >
                  <Sparkles :size="14" class="text-amber-600" />
                </div>

                <div
                  :class="[
                    'text-[13px] text-gray-800',
                    message.role === 'user'
                      ? 'rounded-bl-md rounded-r-md bg-gray-50 p-2'
                      : message.role === 'function'
                        ? 'w-full rounded-md border border-amber-100 bg-amber-50/70 p-2 font-mono text-[12px] text-amber-700'
                        : ''
                  ]"
                >
                  {{ message.content }}
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
                  class="p-1 text-gray-400 transition-colors hover:text-violet-600 disabled:cursor-not-allowed disabled:text-gray-300"
                  :disabled="!copilotInput.trim()"
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
  Sparkles,
  UserCircle,
  X
} from 'lucide-vue-next'
import type { CopilotMode, SessionDocumentState, SessionItem } from './generate-view.types'

const props = defineProps<{
  visible: boolean
  isFullscreen: boolean
  mode: CopilotMode
  session: SessionItem
  copilotInput: string
}>()

defineEmits<{
  (e: 'toggle-fullscreen'): void
  (e: 'close'): void

  (e: 'update:copilot-input', value: string): void
  (e: 'send-copilot-message'): void
}>()

const document = computed<SessionDocumentState>(() => {
  return props.mode === 'analysis' ? props.session.plan : props.session.design
})

const panelTitle = computed(() => {
  return props.mode === 'analysis' ? '需求分析 Copilot 面板' : '规划设计 Copilot 面板'
})

const helperText = computed(() => {
  return props.mode === 'analysis'
    ? '前面的需求分析现在也支持自动批准的 diff 回显，生成后会直接自动合并。'
    : '这里会根据你的设计要求生成正文修改建议，并自动合并到设计文档，同时保留 diff 回显。'
})

const inputPlaceholder = computed(() => {
  return props.mode === 'analysis'
    ? '补充需求分析要求，比如：强调权限边界、补一个接口清单'
    : '补充设计要求，比如：补时序、拆模块、增加数据流说明'
})
</script>
