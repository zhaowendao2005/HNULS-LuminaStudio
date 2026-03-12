<template>
  <div class="of-generate-message-actions relative mt-2 flex justify-end opacity-0 transition-all duration-200 group-hover:opacity-100">
    <div class="flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur-sm">
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
      title="原始会话消息"
      subtitle="用于查看当前回答在生成编辑器里的原始存储结构"
      max-width="760px"
    >
      <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <pre class="of-generate-message-actions-json whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-gray-700">{{ rawMessageText }}</pre>
      </div>
    </CenteredDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GenerationMessage } from '@preload/types'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'

const props = defineProps<{
  message: GenerationMessage
}>()

const isRawDialogOpen = ref(false)

const rawMessageText = computed(() => {
  // 这里把原始消息拆成更易读的结构，方便你直接看存了什么字段。
  const parsedUsage = safeParseJson(props.message.usageJson)
  const parsedMeta = safeParseJson(props.message.metaJson)

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
      usage: parsedUsage,
      meta: parsedMeta,
      createdAt: props.message.createdAt,
      updatedAt: props.message.updatedAt
    },
    null,
    2
  )
})

async function handleCopy(): Promise<void> {
  // 复制优先复制用户最终看到的正文，符合“回答工具按钮”的直觉。
  await navigator.clipboard.writeText(props.message.content || '')
}

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
