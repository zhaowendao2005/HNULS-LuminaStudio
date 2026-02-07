<template>
  <div
    :class="[
      'border rounded-xl px-3 py-2.5 text-xs transition-all',
      isError ? 'bg-rose-50 border-rose-200' : isDone ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 animate-pulse'
    ]"
  >
    <div class="flex items-center gap-2 font-medium mb-2">
      <div
        v-if="!isDone && !isError"
        class="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"
      ></div>
      <svg
        v-else-if="isDone"
        class="w-4 h-4 text-emerald-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <svg
        v-else
        class="w-4 h-4 text-rose-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M18 6L6 18" />
        <path d="m6 6 12 12" />
      </svg>
      <span :class="isError ? 'text-rose-700' : isDone ? 'text-emerald-700' : 'text-slate-600'">
        {{ statusLabel }}: {{ nodeLabel }}
      </span>
    </div>

    <div class="pl-6 text-slate-600 space-y-2">
      <div v-if="nodeBlock.start?.inputs" class="space-y-1">
        <div class="text-slate-400 font-medium">输入</div>
        <pre class="font-mono text-[10px] bg-white/70 px-2 py-1 rounded overflow-x-auto">{{
          formatJson(nodeBlock.start.inputs)
        }}</pre>
      </div>

      <div v-if="nodeBlock.result?.outputs" class="space-y-1">
        <div class="text-slate-400 font-medium">输出</div>
        <pre class="font-mono text-[10px] bg-white/70 px-2 py-1 rounded overflow-x-auto">{{
          formatJson(nodeBlock.result.outputs)
        }}</pre>
      </div>

      <div v-if="nodeBlock.error" class="text-rose-600">
        ⚠️ {{ nodeBlock.error.error?.message || '节点执行失败' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeBlock } from '@renderer/stores/ai-chat/chat-message/types'

const props = defineProps<{
  nodeBlock: NodeBlock
}>()

const isDone = computed(() => Boolean(props.nodeBlock.result))
const isError = computed(() => Boolean(props.nodeBlock.error))

const statusLabel = computed(() => {
  if (isError.value) return '节点失败'
  if (isDone.value) return '节点完成'
  return '节点执行中'
})

const nodeLabel = computed(() => {
  return props.nodeBlock.start?.label || props.nodeBlock.start?.nodeKind || 'node'
})

const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '[Unserializable]'
  }
}
</script>
