<template>
  <div
    class="of-generate-message-actions relative mt-2 flex justify-end opacity-0 transition-all duration-200 group-hover:opacity-100"
  >
    <div
      class="flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur-sm"
    >
      <button
        type="button"
        title="复制回答"
        class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        @click="handleCopy"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
      <button
        type="button"
        title="查看原始会话"
        class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        @click="isRawDialogOpen = true"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 18l6-6-6-6" />
          <path d="M8 6l-6 6 6 6" />
        </svg>
      </button>
    </div>

    <CenteredDialog
      v-model="isRawDialogOpen"
      title="本次通道对话"
      :subtitle="dialogSubtitle"
      max-width="920px"
    >
      <div class="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
          @click="handleCopyConversationText"
        >
          复制全部正文
        </button>
        <button
          type="button"
          class="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
          @click="handleCopyRawOutputs"
        >
          复制原始 LLM 输出
        </button>
        <button
          type="button"
          class="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
          @click="handleCopyConversationRaw"
        >
          复制完整对象
        </button>
      </div>
      <div ref="rawDialogContentRef" class="space-y-4">
        <section class="rounded-xl border border-gray-200 bg-white p-4">
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="text-[12px] font-semibold text-gray-800">全部正文</div>
            <button
              type="button"
              class="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
              @click="handleCopyConversationText"
            >
              复制正文
            </button>
          </div>
          <pre
            class="whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-gray-700"
            >{{ conversationText }}</pre
          >
        </section>

        <section class="rounded-xl border border-gray-200 bg-white p-4">
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="text-[12px] font-semibold text-gray-800">全部原始 LLM 输出</div>
            <button
              type="button"
              class="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
              @click="handleCopyRawOutputs"
            >
              复制原始输出
            </button>
          </div>
          <pre
            class="whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-gray-700"
            >{{ rawOutputText }}</pre
          >
        </section>

        <section class="rounded-xl border border-gray-200 bg-white p-4">
          <div class="mb-2 text-[12px] font-semibold text-gray-800">当前消息完整对象</div>
          <pre
            class="whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-gray-700"
            >{{ currentMessageText }}</pre
          >
        </section>

        <section class="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div class="mb-2 text-[12px] font-semibold text-gray-800">本次分析对话完整对象</div>
          <pre
            class="of-generate-message-actions-json whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-gray-700"
            >{{ conversationRawText }}</pre
          >
        </section>
      </div>
    </CenteredDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { GenerationMessage } from '@preload/types'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'

const props = defineProps<{
  message: GenerationMessage
  messages: GenerationMessage[]
}>()

const isRawDialogOpen = ref(false)
const rawDialogContentRef = ref<HTMLElement | null>(null)

const parsedCurrentUsage = computed(() => safeParseJson(props.message.usageJson))
const parsedCurrentMeta = computed(() => safeParseJson(props.message.metaJson))
const dialogSubtitle = computed(() => {
  return `显示当前 ${props.message.channelKey} 通道里的全部消息内容、原始 LLM 输出与完整对象`
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

const conversationText = computed(() => {
  if (!props.messages.length) {
    return '(当前通道暂无消息)'
  }

  return props.messages
    .map((message, index) => {
      const roleLabel =
        message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Lumina Agent' : 'System'

      return [
        `#${index + 1} [${roleLabel}]`,
        `status: ${message.status}`,
        message.content?.trim() || '(空正文)'
      ].join('\n')
    })
    .join('\n\n')
})

const rawOutputText = computed(() => {
  const assistantOutputs = props.messages
    .filter((message) => message.role === 'assistant')
    .map((message, index) => {
      return [
        `#${index + 1} [assistant]`,
        `id: ${message.id}`,
        `status: ${message.status}`,
        message.rawResponseText?.trim() || '(无原始 LLM 输出)'
      ].join('\n')
    })

  if (!assistantOutputs.length) {
    return '未开启 Generate 全局配置中的“保存原始 LLM 输出到数据库”，或当前通道暂无 assistant 原始输出。'
  }

  return assistantOutputs.join('\n\n')
})

const conversationRawText = computed(() => {
  return JSON.stringify(
    props.messages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      channelKey: message.channelKey,
      requestId: message.requestId,
      role: message.role,
      status: message.status,
      providerId: message.providerId,
      modelId: message.modelId,
      content: message.content,
      error: message.error,
      usage: safeParseJson(message.usageJson),
      meta: safeParseJson(message.metaJson),
      rawResponseText: message.rawResponseText,
      rawTrace: safeParseJson(message.rawTraceJson),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    })),
    null,
    2
  )
})

async function handleCopy(): Promise<void> {
  // 复制优先复制用户最终看到的正文，符合“回答工具按钮”的直觉。
  await navigator.clipboard.writeText(props.message.content || '')
}

async function handleCopyConversationText(): Promise<void> {
  await navigator.clipboard.writeText(conversationText.value)
}

async function handleCopyRawOutputs(): Promise<void> {
  await navigator.clipboard.writeText(rawOutputText.value)
}

async function handleCopyConversationRaw(): Promise<void> {
  await navigator.clipboard.writeText(conversationRawText.value)
}

watch(isRawDialogOpen, async (opened) => {
  if (!opened) return
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
