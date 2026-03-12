<template>
  <div
    :class="[
      'of-generate-analysis-copilot flex shrink-0 flex-col border-l border-gray-200 bg-white transition-all duration-300 ease-in-out',
      visible
        ? isFullscreen
          ? 'absolute inset-0 z-20 w-full'
          : 'relative w-1/2'
        : 'w-0 overflow-hidden border-l-0 opacity-0'
    ]"
  >
    <template v-if="visible">
      <div class="flex h-full flex-col bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.03)]">
        <div
          class="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4"
        >
          <div class="flex min-w-0 items-center gap-2 overflow-hidden">
            <GitBranch :size="16" class="shrink-0 text-gray-400" />
            <h3 class="truncate text-[13px] font-semibold text-gray-800">需求分析 Copilot 面板</h3>
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

        <div class="flex flex-1 flex-col overflow-hidden">
          <div class="flex min-h-0 flex-1 flex-col border-b border-gray-200 bg-[#fbfbfc]">
            <div
              class="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2"
            >
              <div class="min-w-0">
                <div class="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {{ document?.title || '等待选择 planning 工作稿' }}
                </div>
                <div class="mt-1 text-[11px] text-gray-400">
                  planning block 与 copilot 共享同一份 markdown，标题框架固定不可改。
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :class="viewMode === 'preview' ? activeTabClass : tabClass"
                  @click="$emit('update:view-mode', 'preview')"
                >
                  预览
                </button>
                <button
                  type="button"
                  :class="viewMode === 'source' ? activeTabClass : tabClass"
                  @click="$emit('update:view-mode', 'source')"
                >
                  源码
                </button>
                <button
                  type="button"
                  :class="viewMode === 'diff' ? activeTabClass : tabClass"
                  @click="$emit('update:view-mode', 'diff')"
                >
                  Diff
                </button>
              </div>
            </div>

            <div v-if="document" class="flex-1 overflow-y-auto p-4">
              <div
                v-if="viewMode === 'preview'"
                class="rounded-xl border border-gray-200 bg-white p-4"
              >
                <!-- eslint-disable vue/no-v-html -->
                <div
                  class="of-generate-analysis-copilot-markdown text-[12px] leading-6 text-gray-700"
                  v-html="previewHtml"
                ></div>
                <!-- eslint-enable vue/no-v-html -->
              </div>

              <div
                v-else-if="viewMode === 'source'"
                class="h-full rounded-xl border border-gray-200 bg-white p-4"
              >
                <textarea
                  v-model="localDraft"
                  class="h-full min-h-[260px] w-full resize-none border-none bg-transparent font-mono text-[12px] leading-6 text-gray-800 outline-none"
                  placeholder="在固定 planning 框架下编辑 markdown 正文..."
                  @blur="handleBlurSave"
                ></textarea>
              </div>

              <div v-else class="rounded-xl border border-gray-200 bg-white p-4">
                <div v-if="!hasDiff" class="text-[12px] text-gray-400">
                  当前工作稿与原始稿暂无差异。
                </div>
                <div v-else class="space-y-1 font-mono text-[12px] leading-6">
                  <div
                    v-for="(line, index) in diffLines"
                    :key="`${index}-${line.type}-${line.text}`"
                    :class="[
                      'rounded px-2 py-0.5',
                      line.type === 'added'
                        ? 'bg-emerald-50 text-emerald-700'
                        : line.type === 'removed'
                          ? 'bg-rose-50 text-rose-700'
                          : 'text-gray-500'
                    ]"
                  >
                    <span class="mr-2 inline-block w-4">
                      {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}
                    </span>
                    <span>{{ line.text || ' ' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex flex-1 items-center justify-center px-6 text-[12px] text-gray-400"
            >
              先在需求分析与计划主对话里选择一条 planning block，再使用 Copilot 调整。
            </div>

            <div class="border-t border-gray-100 bg-white px-4 py-2 text-[11px] text-gray-400">
              <span v-if="isSaving">正在保存 planning 工作稿...</span>
              <span v-else>源码视图支持自动保存；若你改动了标题框架，保存会被拒绝。</span>
            </div>
          </div>

          <div class="flex min-h-0 flex-1 flex-col bg-white">
            <div class="border-b border-gray-100 bg-gray-50/80 px-4 py-2">
              <span
                class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                <RefreshCw :size="12" />
                Copilot 对话流
              </span>
            </div>

            <div class="flex-1 space-y-4 overflow-y-auto p-4">
              <div class="text-center text-xs text-gray-400">
                Copilot 会围绕当前共享 planning 工作稿给出命令式修改提案。
              </div>

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
                  <div
                    class="relative rounded-xl"
                    :class="message.role === 'assistant' ? 'pr-2' : ''"
                  >
                    {{ message.content }}
                    <span
                      v-if="message.status === 'streaming'"
                      class="ml-1 inline-block h-3 w-1 animate-pulse bg-violet-500 align-middle"
                    ></span>
                    <GenerateMessageActionGroup
                      v-if="message.role === 'assistant' && message.status !== 'streaming'"
                      :message="message"
                      :messages="messages"
                    />
                  </div>

                  <div
                    v-if="getCopilotEditBlock(message)"
                    class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <div class="text-[11px] font-semibold text-slate-700">
                          Planning 命令提案
                        </div>
                        <div class="mt-1 text-[11px] text-slate-500">
                          状态：{{ editStatusLabel(getCopilotEditBlock(message)?.status || '') }} ·
                          影响小节：{{
                            getCopilotEditBlock(message)?.affectedSectionKeys.join(', ') || '无'
                          }}
                        </div>
                      </div>
                      <div
                        v-if="getCopilotEditBlock(message)?.status === 'pending'"
                        class="flex items-center gap-2"
                      >
                        <button
                          type="button"
                          class="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                          @click="$emit('apply-proposal', message.id)"
                        >
                          应用命令
                        </button>
                        <button
                          type="button"
                          class="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                          @click="$emit('reject-proposal', message.id)"
                        >
                          拒绝命令
                        </button>
                      </div>
                    </div>
                    <pre
                      class="mt-2 whitespace-pre-wrap break-all rounded-lg bg-white p-2 font-mono text-[11px] leading-5 text-slate-700"
                      >{{ getCopilotEditBlock(message)?.commandDsl }}</pre
                    >
                    <div
                      v-if="getCopilotEditBlock(message)?.errorMessage"
                      class="mt-2 text-[11px] text-rose-500"
                    >
                      {{ getCopilotEditBlock(message)?.errorMessage }}
                    </div>
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
                  placeholder="输入你想让 Copilot 调整 planning 工作稿的要求..."
                  class="flex-1 border-none bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                  @input="$emit('update:copilot-input', ($event.target as HTMLInputElement).value)"
                  @keydown.enter="$emit('send-copilot-message')"
                />
                <button
                  type="button"
                  class="p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
                  :disabled="!copilotInput.trim() || isStreaming || !document"
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
import { computed, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import {
  Bot,
  GitBranch,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  UserCircle,
  X
} from 'lucide-vue-next'
import type { GenerationMessage, GenerationPlanningDocument } from '@preload/types'
import {
  buildPlanningDiffLines,
  getGenerationCopilotEditBlock
} from '@renderer/stores/orchestraflow/generation-editor/generation-editor.types'
import GenerateMessageActionGroup from './GenerateMessageActionGroup.vue'
import type { GenerateAnalysisPlanningViewMode } from '@renderer/stores/orchestraflow/generation-editor/generation-editor.types'

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: true
})

const props = defineProps<{
  visible: boolean
  isFullscreen: boolean
  sessionTitle: string
  document: GenerationPlanningDocument | null
  viewMode: GenerateAnalysisPlanningViewMode
  messages: GenerationMessage[]
  autoApproved: boolean
  copilotInput: string
  isStreaming: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-auto-approved'): void
  (e: 'toggle-fullscreen'): void
  (e: 'close'): void
  (e: 'update:copilot-input', value: string): void
  (e: 'update:view-mode', value: GenerateAnalysisPlanningViewMode): void
  (e: 'send-copilot-message'): void
  (e: 'save-document', value: string): void
  (e: 'apply-proposal', messageId: string): void
  (e: 'reject-proposal', messageId: string): void
}>()

const tabClass =
  'rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700'
const activeTabClass =
  'rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700'

const localDraft = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.document?.content,
  (nextContent) => {
    localDraft.value = nextContent || ''
  },
  { immediate: true }
)

watch(localDraft, (value) => {
  if (props.viewMode !== 'source' || !props.document) {
    return
  }
  if (value === props.document.content) {
    return
  }

  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  // 这里用组件本地 debounce，只负责“什么时候保存”；真正业务保存仍回到 facade store。
  saveTimer = setTimeout(() => {
    emit('save-document', value)
  }, 800)
})

const previewHtml = computed(() => markdown.render(props.document?.content || ''))
const diffLines = computed(() => {
  if (!props.document) {
    return []
  }
  return buildPlanningDiffLines({
    sourceMarkdown: props.document.sourceMarkdown,
    currentMarkdown: props.document.content
  })
})
const hasDiff = computed(() => diffLines.value.some((line) => line.type !== 'unchanged'))

function handleBlurSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  emit('save-document', localDraft.value)
}

function getCopilotEditBlock(message: GenerationMessage) {
  return getGenerationCopilotEditBlock(message)
}

function editStatusLabel(status: string): string {
  if (status === 'pending') return '等待批准'
  if (status === 'applied') return '已应用'
  if (status === 'rejected') return '已拒绝'
  if (status === 'failed') return '执行失败'
  if (status === 'noop') return '无需修改'
  return status
}
</script>

<style scoped>
.of-generate-analysis-copilot-markdown :deep(h1),
.of-generate-analysis-copilot-markdown :deep(h2),
.of-generate-analysis-copilot-markdown :deep(h3) {
  margin: 0.6rem 0 0.35rem;
  font-weight: 600;
}

.of-generate-analysis-copilot-markdown :deep(p) {
  margin: 0.35rem 0;
}

.of-generate-analysis-copilot-markdown :deep(ul),
.of-generate-analysis-copilot-markdown :deep(ol) {
  margin: 0.4rem 0;
  padding-left: 1.2rem;
}

.of-generate-analysis-copilot-markdown :deep(li) {
  margin: 0.2rem 0;
}
</style>
