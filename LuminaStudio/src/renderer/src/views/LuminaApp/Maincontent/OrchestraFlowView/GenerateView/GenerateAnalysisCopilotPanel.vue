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

        <div :class="['flex flex-1 overflow-hidden', isFullscreen ? 'flex-row' : 'flex-col']">
          <div
            :class="[
              'flex min-h-0 flex-1 flex-col bg-white',
              isFullscreen ? 'w-1/2 border-r border-gray-200' : 'border-b border-gray-200'
            ]"
          >
            <div
              class="flex h-10 shrink-0 items-center justify-between border-b border-gray-200 bg-[#f3f3f3] px-4"
            >
              <div class="flex min-w-0 items-center gap-3 overflow-hidden">
                <div class="flex items-center gap-2 text-[13px] font-medium text-gray-700">
                  <FileCode :size="15" class="text-yellow-500" />
                  <span class="truncate">{{ document?.title || '等待选择 planning 工作稿' }}</span>
                  <span class="h-2 w-2 rounded-full bg-blue-400"></span>
                </div>
                <div class="truncate text-[11px] text-gray-400">
                  planning block 与 copilot 共享同一份 markdown，标题框架固定不可改。
                </div>
              </div>
            </div>

            <div
              class="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm"
            >
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 text-[13px] text-gray-600">
                  <span class="font-semibold text-gray-800">审查修改</span>
                  <span
                    v-if="pendingCount > 0"
                    class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700"
                  >
                    {{ pendingCount }} 个待处理
                  </span>
                  <span v-else class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    全部已处理
                  </span>
                </div>
                <div class="h-4 w-px bg-gray-300"></div>
                <div class="flex rounded border border-gray-200 bg-gray-100 p-0.5">
                  <button
                    type="button"
                    :class="viewMode === 'preview' ? activeToolbarTabClass : toolbarTabClass"
                    @click="$emit('update:view-mode', 'preview')"
                  >
                    <AlignLeft :size="14" />
                    单栏视图
                  </button>
                  <button
                    type="button"
                    :class="viewMode === 'diff' ? activeToolbarTabClass : toolbarTabClass"
                    @click="$emit('update:view-mode', 'diff')"
                  >
                    <Columns2 :size="14" />
                    双栏视图
                  </button>
                  <button
                    type="button"
                    :class="viewMode === 'source' ? activeToolbarTabClass : toolbarTabClass"
                    @click="$emit('update:view-mode', 'source')"
                  >
                    <Code2 :size="14" />
                    源码
                  </button>
                </div>
              </div>
            </div>

            <div v-if="document" class="flex-1 overflow-auto bg-white py-4">
              <div v-if="viewMode === 'source'" class="h-full px-4">
                <div class="h-full border border-gray-200 bg-white p-4">
                  <textarea
                    v-model="localDraft"
                    class="h-full min-h-[260px] w-full resize-none border-none bg-transparent font-mono text-[13px] leading-6 text-gray-800 outline-none"
                    placeholder="在固定 planning 框架下编辑 markdown 正文..."
                    @blur="handleBlurSave"
                  ></textarea>
                </div>
              </div>

              <div v-else-if="viewMode === 'preview'" class="px-4">
                <div class="of-generate-analysis-copilot-markdown text-[13px] text-gray-700">
                  <section v-for="section in previewSections" :key="section.key" class="mb-10">
                    <h2 class="mb-1 text-[28px] font-bold tracking-tight text-gray-900">
                      {{ section.title }}
                    </h2>
                    <div class="mb-4 text-[11px] text-gray-400">{{ section.key }}</div>

                    <!-- eslint-disable vue/no-v-html -->
                    <div
                      v-if="section.currentContent.trim()"
                      v-html="renderSectionHtml(section.currentContent)"
                    ></div>
                    <!-- eslint-enable vue/no-v-html -->

                    <div v-if="section.pendingReviews.length" class="mt-5 space-y-5">
                      <div
                        v-for="review in mergedSectionReviews(section.pendingReviews)"
                        :key="`${review.messageId}-${review.sectionKey}`"
                        class="space-y-3"
                      >
                        <div
                          class="border-l-4 border-rose-300 bg-rose-50/55 px-4 py-3 text-rose-700"
                        >
                          <div
                            class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-500"
                          >
                            原来的
                          </div>
                          <pre
                            class="whitespace-pre-wrap break-words font-mono text-[13px] leading-6"
                            >{{ review.currentContent || ' ' }}</pre
                          >
                        </div>

                        <div
                          class="border-l-4 border-emerald-300 bg-emerald-50/55 px-4 py-3 text-emerald-700"
                        >
                          <div
                            class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-500"
                          >
                            改动后的
                          </div>
                          <pre
                            class="whitespace-pre-wrap break-words font-mono text-[13px] leading-6"
                            >{{ review.proposedContent || ' ' }}</pre
                          >
                        </div>

                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            class="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                            @click="emitApplyReview(review)"
                          >
                            接受修改
                          </button>
                          <button
                            type="button"
                            class="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                            @click="emitRejectReview(review)"
                          >
                            取消修改
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div v-else class="px-4">
                <div v-if="diffSections.length" class="space-y-8">
                  <section v-for="section in diffSections" :key="section.key" class="space-y-3">
                    <div>
                      <div class="text-[18px] font-semibold text-gray-900">{{ section.title }}</div>
                      <div class="mt-1 text-[11px] text-gray-400">{{ section.key }}</div>
                    </div>

                    <div
                      v-for="review in mergedSectionReviews(section.pendingReviews)"
                      :key="`diff-${review.messageId}-${review.sectionKey}`"
                      class="space-y-3"
                    >
                      <div class="grid grid-cols-2 gap-4">
                        <div
                          class="border-l-4 border-rose-300 bg-rose-50/55 px-4 py-3 text-rose-700"
                        >
                          <div
                            class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-500"
                          >
                            原来的
                          </div>
                          <pre
                            class="whitespace-pre-wrap break-words font-mono text-[13px] leading-6"
                            >{{ review.currentContent || ' ' }}</pre
                          >
                        </div>
                        <div
                          class="border-l-4 border-emerald-300 bg-emerald-50/55 px-4 py-3 text-emerald-700"
                        >
                          <div
                            class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-500"
                          >
                            改动后的
                          </div>
                          <pre
                            class="whitespace-pre-wrap break-words font-mono text-[13px] leading-6"
                            >{{ review.proposedContent || ' ' }}</pre
                          >
                        </div>
                      </div>

                      <div
                        v-if="review.messageId !== '__baseline__'"
                        class="flex items-center gap-2"
                      >
                        <button
                          type="button"
                          class="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                          @click="emitApplyReview(review)"
                        >
                          接受修改
                        </button>
                        <button
                          type="button"
                          class="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                          @click="emitRejectReview(review)"
                        >
                          取消修改
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
                <div v-else class="px-2 text-[12px] text-gray-400">
                  当前工作稿与原始稿暂无差异。
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

          <div :class="['flex min-h-0 flex-1 flex-col bg-[#f8f9fa]', isFullscreen ? 'w-1/2' : '']">
            <div class="flex h-10 shrink-0 items-center border-b border-gray-200 bg-white px-4">
              <span
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                <MessageSquare :size="14" />
                AI 助手
              </span>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <div
                v-for="message in messages"
                :key="message.id"
                :class="['flex gap-3', message.role === 'user' ? 'flex-row-reverse' : '']"
              >
                <div
                  :class="[
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                  ]"
                >
                  <UserCircle v-if="message.role === 'user'" :size="14" />
                  <Bot v-else :size="14" />
                </div>
                <div
                  :class="[
                    'rounded-lg border p-3 text-[13px] leading-relaxed',
                    message.role === 'user'
                      ? 'border-blue-100 bg-blue-50 text-blue-900'
                      : 'bg-white text-gray-700 shadow-sm border-gray-200'
                  ]"
                >
                  <button
                    v-if="
                      message.role === 'assistant' &&
                      message.status === 'streaming' &&
                      message.requestId
                    "
                    type="button"
                    class="mb-2 flex items-center gap-1 rounded border border-rose-200 bg-white px-2 py-1 text-[10px] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                    @click="$emit('abort-request', message.requestId)"
                  >
                    <Square :size="10" />
                    停止
                  </button>
                  {{ message.content }}
                  <span
                    v-if="message.status === 'streaming'"
                    class="ml-1 inline-block h-3 w-1 animate-pulse bg-violet-500 align-middle"
                  ></span>
                  <GenerateMessageActionGroup
                    v-if="message.role === 'assistant'"
                    :message="message"
                  />
                  <div v-if="messageErrorText(message)" class="mt-2 text-[11px] text-rose-500">
                    {{ messageErrorText(message) }}
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-gray-200 bg-white p-4">
              <div
                class="relative rounded-md border border-gray-300 transition-shadow focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
              >
                <textarea
                  :model-value="copilotInput"
                  :disabled="isStreaming"
                  class="min-h-[80px] max-h-32 w-full resize-none bg-transparent p-3 text-[13px] outline-none"
                  :placeholder="copilotInputPlaceholder"
                  @input="
                    $emit('update:copilot-input', ($event.target as HTMLTextAreaElement).value)
                  "
                  @keydown.enter.exact.prevent="$emit('send-copilot-message')"
                />
                <button
                  type="button"
                  class="absolute bottom-2 right-2 rounded-md bg-blue-600 p-1.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
  OF_PLANNING_SECTION_DEFINITIONS,
  parseOFPlanningMarkdown,
  type OFPlanningSectionKey
} from '@shared/Orchestraflow-types'
import {
  AlignLeft,
  Bot,
  Code2,
  Columns2,
  FileCode,
  GitBranch,
  Maximize2,
  MessageSquare,
  Minimize2,
  Send,
  Square,
  UserCircle,
  X
} from 'lucide-vue-next'
import type { GenerationMessage, GenerationPlanningDocument } from '@preload/types'
import {
  getGenerationCopilotEditBlock,
  getPendingGenerationPlanningSectionReviews,
  type GeneratePlanningSectionReview
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
  (e: 'apply-review', payload: { messageId: string; sectionKeys: OFPlanningSectionKey[] }): void
  (e: 'reject-review', payload: { messageId: string; sectionKeys: OFPlanningSectionKey[] }): void
  (e: 'abort-request', requestId: string): void
}>()

const toolbarTabClass =
  'flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-gray-500 transition-colors hover:text-gray-700'
const activeToolbarTabClass =
  'flex items-center gap-1.5 rounded bg-white px-2 py-1.5 text-xs font-medium text-gray-800 shadow-sm'

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

  saveTimer = setTimeout(() => {
    emit('save-document', value)
  }, 800)
})

const pendingSectionReviews = computed<GeneratePlanningSectionReview[]>(() => {
  if (!props.document) {
    return []
  }
  return getPendingGenerationPlanningSectionReviews({
    document: props.document,
    messages: props.messages
  })
})

const pendingCount = computed(() => pendingSectionReviews.value.length)

const copilotInputPlaceholder = computed(() => {
  return props.isStreaming ? '消息已发出，等待 AI 回复中...' : '向 AI 提问或提出修改建议...'
})

const sourceDocument = computed(() => {
  if (!props.document) {
    return null
  }
  return parseOFPlanningMarkdown(props.document.sourceMarkdown).document
})

const previewSections = computed(() => {
  if (!props.document) {
    return []
  }

  return OF_PLANNING_SECTION_DEFINITIONS.map((definition) => {
    const currentContent = props.document?.sections[definition.key] || ''
    const sectionReviews = pendingSectionReviews.value.filter(
      (review) => review.sectionKey === definition.key
    )

    return {
      key: definition.key,
      title: definition.title,
      currentContent,
      pendingReviews: sectionReviews
    }
  }).filter((section) => section.currentContent.trim() || section.pendingReviews.length)
})

const diffSections = computed(() => {
  if (pendingSectionReviews.value.length) {
    return OF_PLANNING_SECTION_DEFINITIONS.map((definition) => ({
      key: definition.key,
      title: definition.title,
      pendingReviews: pendingSectionReviews.value.filter(
        (review) => review.sectionKey === definition.key
      )
    })).filter((section) => section.pendingReviews.length)
  }

  if (!props.document || !sourceDocument.value) {
    return []
  }

  return OF_PLANNING_SECTION_DEFINITIONS.map((definition) => {
    const currentContent = props.document?.sections[definition.key] || ''
    const sourceContent = sourceDocument.value?.sections[definition.key] || ''
    if (currentContent === sourceContent) {
      return null
    }
    return {
      key: definition.key,
      title: definition.title,
      pendingReviews: [
        {
          messageId: '__baseline__',
          sectionKey: definition.key,
          sectionTitle: definition.title,
          currentContent: sourceContent,
          proposedContent: currentContent
        }
      ]
    }
  }).filter(
    (
      section
    ): section is { key: string; title: string; pendingReviews: GeneratePlanningSectionReview[] } =>
      Boolean(section)
  )
})

function handleBlurSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  emit('save-document', localDraft.value)
}

function renderSectionHtml(content: string): string {
  if (!content.trim()) {
    return '<p class="text-gray-400">暂无内容</p>'
  }
  return markdown.render(content)
}

function emitApplyReview(review: GeneratePlanningSectionReview): void {
  emit('apply-review', {
    messageId: review.messageId,
    sectionKeys: [review.sectionKey]
  })
}

function emitRejectReview(review: GeneratePlanningSectionReview): void {
  emit('reject-review', {
    messageId: review.messageId,
    sectionKeys: [review.sectionKey]
  })
}

function mergedSectionReviews(
  reviews: GeneratePlanningSectionReview[]
): GeneratePlanningSectionReview[] {
  if (!reviews.length) {
    return []
  }

  const first = reviews[0]
  return [
    {
      ...first,
      currentContent: reviews
        .map((item) => item.currentContent)
        .filter(Boolean)
        .join('\n\n'),
      proposedContent: reviews
        .map((item) => item.proposedContent)
        .filter(Boolean)
        .join('\n\n')
    }
  ]
}

function getCopilotEditBlock(message: GenerationMessage) {
  return getGenerationCopilotEditBlock(message)
}

function messageErrorText(message: GenerationMessage): string | null {
  if (message.error) {
    return message.error
  }
  const block = getCopilotEditBlock(message)
  if (block?.status === 'failed') {
    return block.errorMessage || null
  }
  return null
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
