<template>
  <div class="of-generate-message-actions relative mt-2 flex justify-end">
    <div
      class="flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur-sm"
    >
      <button
        type="button"
        title="查看详细内容"
        class="flex h-7 items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
        @click="isRawDialogOpen = true"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 18l6-6-6-6" />
          <path d="M8 6l-6 6 6 6" />
        </svg>
        <span>查看详情</span>
      </button>
      <button
        type="button"
        title="复制回答"
        class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 opacity-0 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100 group-focus-within:opacity-100"
        @click="handleCopy"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </div>

    <CenteredDialog
      v-model="isRawDialogOpen"
      title="当前消息详情"
      :subtitle="dialogSubtitle"
      max-width="920px"
    >
      <div class="mb-3 flex items-center justify-end gap-2">
        <div
          class="mr-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1"
        >
          <button
            v-for="tab in rawDialogTabs"
            :key="tab.id"
            type="button"
            :class="[
              'rounded-md px-3 py-1.5 text-[12px] transition-colors',
              activeRawDialogTab === tab.id
                ? 'bg-white font-semibold text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            ]"
            @click="activeRawDialogTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        <button
          type="button"
          class="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
          @click="handleCopyContent"
        >
          复制正文
        </button>
        <button
          type="button"
          class="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
          @click="handleCopyRawOutput"
        >
          复制原始输出
        </button>
        <button
          type="button"
          class="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
          @click="handleCopyCurrentMessageRaw"
        >
          复制完整对象
        </button>
      </div>
      <div ref="rawDialogContentRef" class="space-y-4">
        <section
          v-if="activeRawDialogTab === 'prompt'"
          class="rounded-xl border border-amber-200 bg-amber-50/70 p-4"
        >
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="text-[12px] font-semibold text-amber-900">
              当前消息真实发送给 LLM 的提示词
            </div>
            <button
              type="button"
              class="rounded-md border border-amber-200 bg-white px-2.5 py-1 text-[11px] text-amber-700 transition-colors hover:bg-amber-100"
              @click="handleCopyPromptMessages"
            >
              复制提示词
            </button>
          </div>
          <pre
            class="whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-amber-900"
            >{{ llmPromptText }}</pre
          >
        </section>

        <section
          v-if="activeRawDialogTab === 'content'"
          class="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="text-[12px] font-semibold text-gray-800">当前消息正文</div>
            <button
              type="button"
              class="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
              @click="handleCopyContent"
            >
              复制正文
            </button>
          </div>
          <pre
            class="whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-gray-700"
            >{{ currentContentText }}</pre
          >
        </section>

        <section
          v-if="activeRawDialogTab === 'raw-output'"
          class="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="text-[12px] font-semibold text-gray-800">当前消息原始 LLM 输出</div>
            <button
              type="button"
              class="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
              @click="handleCopyRawOutput"
            >
              复制原始输出
            </button>
          </div>
          <pre
            class="whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-gray-700"
            >{{ currentRawOutputText }}</pre
          >
        </section>

        <section
          v-if="activeRawDialogTab === 'current-message'"
          class="rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
          <div class="mb-2 text-[12px] font-semibold text-gray-800">当前消息完整对象</div>
          <pre
            class="of-generate-message-actions-json whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-gray-700"
            >{{ currentMessageText }}</pre
          >
        </section>
      </div>
    </CenteredDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type {
  GenerationLlmPromptMessage,
  GenerationMessage,
  GenerationMessageMetaPayload
} from '@preload/types'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'

const props = defineProps<{
  message: GenerationMessage
}>()

type RawDialogTabId = 'prompt' | 'content' | 'raw-output' | 'current-message'

const isRawDialogOpen = ref(false)
const activeRawDialogTab = ref<RawDialogTabId>('prompt')
const rawDialogContentRef = ref<HTMLElement | null>(null)

const rawDialogTabs: Array<{ id: RawDialogTabId; label: string }> = [
  { id: 'prompt', label: '完整提示词' },
  { id: 'content', label: '当前正文' },
  { id: 'raw-output', label: '原始输出' },
  { id: 'current-message', label: '消息对象' }
]

const parsedCurrentUsage = computed(() => safeParseJson(props.message.usageJson))
const parsedCurrentMeta = computed(
  () => safeParseJson(props.message.metaJson) as GenerationMessageMetaPayload | null
)
const dialogSubtitle = computed(() => {
  return `只显示当前 ${props.message.channelKey} message block 的内容，不拼接其他消息。`
})

const llmPromptText = computed(() => {
  const promptMessages = parsedCurrentMeta.value?.llmRequest?.messages || []

  if (!promptMessages.length) {
    return '(当前消息还没有记录到发送给 LLM 的完整提示词)'
  }

  return promptMessages
    .map((promptMessage: GenerationLlmPromptMessage, promptIndex) => {
      const roleLabel =
        promptMessage.role === 'system'
          ? 'System Prompt'
          : promptMessage.role === 'user'
            ? 'User Prompt'
            : 'Assistant Prompt'

      return [
        `#${promptIndex + 1} [${roleLabel}]`,
        `messageId: ${props.message.id}`,
        `status: ${props.message.status}`,
        promptMessage.content?.trim() || '(空正文)'
      ].join('\n')
    })
    .join('\n\n')
})

const currentContentText = computed(() => {
  return props.message.content?.trim() || '(空正文)'
})

const currentRawOutputText = computed(() => {
  return props.message.rawResponseText?.trim()
    ? props.message.rawResponseText.trim()
    : '未开启 Generate 全局配置中的“保存原始 LLM 输出到数据库”，或当前消息暂无原始输出。'
})

const currentMessageText = computed(() => {
  return JSON.stringify(
    {
      id: props.message.id,
      sessionId: props.message.sessionId,
      channelKey: props.message.channelKey,
      requestId: props.message.requestId,
      role: props.message.role,
      status: props.message.status,
      providerId: props.message.providerId,
      modelId: props.message.modelId,
      content: props.message.content,
      error: props.message.error,
      usage: parsedCurrentUsage.value,
      meta: parsedCurrentMeta.value,
      rawResponseText: props.message.rawResponseText,
      rawTrace: safeParseJson(props.message.rawTraceJson),
      createdAt: props.message.createdAt,
      updatedAt: props.message.updatedAt
    },
    null,
    2
  )
})

async function handleCopy(): Promise<void> {
  // 复制按钮只复制当前消息正文，避免把多个 block 串起来。
  await navigator.clipboard.writeText(props.message.content || '')
}

async function handleCopyContent(): Promise<void> {
  await navigator.clipboard.writeText(currentContentText.value)
}

async function handleCopyPromptMessages(): Promise<void> {
  await navigator.clipboard.writeText(llmPromptText.value)
}

async function handleCopyRawOutput(): Promise<void> {
  await navigator.clipboard.writeText(currentRawOutputText.value)
}

async function handleCopyCurrentMessageRaw(): Promise<void> {
  await navigator.clipboard.writeText(currentMessageText.value)
}

watch(isRawDialogOpen, async (opened) => {
  if (!opened) return
  activeRawDialogTab.value = 'prompt'
  await nextTick()
  rawDialogContentRef.value?.scrollIntoView({ block: 'start' })
})

function safeParseJson(input: string | null): unknown {
  if (!input) {
    return null
  }

  try {
    return JSON.parse(input)
  } catch {
    return input
  }
}
</script>
