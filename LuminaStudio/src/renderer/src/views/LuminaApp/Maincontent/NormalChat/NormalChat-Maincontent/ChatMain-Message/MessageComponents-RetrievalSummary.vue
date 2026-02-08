<template>
  <!--
    RetrievalSummaryMessage

    这个组件专门用于渲染 nodeKind = 'retrieval_summary' 的节点。

    对小白的理解方式：
    - 总结节点 = “AI 看完检索证据后，判断够不够回答”
    - shouldLoop=false：够了，message 是最终答案
    - shouldLoop=true ：不够，message 是下一轮要继续检索的方向/缺口
  -->
  <div
    :class="[
      'border rounded-xl px-3 py-2.5 text-xs transition-all',
      isError
        ? 'bg-rose-50 border-rose-200'
        : isDone
          ? shouldLoop
            ? 'bg-amber-50 border-amber-200'
            : 'bg-emerald-50 border-emerald-200'
          : 'bg-slate-50 border-slate-200 animate-pulse'
    ]"
  >
    <!-- Header -->
    <div class="flex items-center gap-2 font-medium mb-2">
      <div
        v-if="!isDone && !isError"
        class="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"
      ></div>
      <svg
        v-else-if="isDone && !isError && !shouldLoop"
        class="w-4 h-4 text-emerald-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <svg
        v-else-if="isDone && !isError && shouldLoop"
        class="w-4 h-4 text-amber-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M12 20h9" />
        <path d="M12 4h9" />
        <path d="M4 12h17" />
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

      <span :class="headerTextClass">{{ statusLabel }}: 总结与判断</span>
      <span v-if="modelId" class="text-[10px] text-slate-400 font-normal">({{ modelId }})</span>
    </div>

    <!-- Body -->
    <div class="pl-6 text-slate-700 space-y-2">
      <!-- Error -->
      <div v-if="isError" class="text-rose-600">⚠️ {{ errorMessage }}</div>

      <!-- Decision -->
      <div v-if="isDone" class="space-y-1">
        <div class="text-slate-400 font-medium">判定</div>

        <!-- 轮次显示 -->
        <div class="text-[11px] mb-1">
          <span class="font-medium text-slate-600">轮次：</span>
          <span
            :class="
              currentIteration >= maxIterations - 1
                ? 'text-amber-700 font-semibold'
                : 'text-slate-700'
            "
          >
            {{ iterationText }}
          </span>
          <span class="text-[10px] ml-1.5 text-slate-400">({{ iterationLabel }})</span>
        </div>

        <div class="text-[11px]">
          <span class="font-medium">shouldLoop:</span>
          <span :class="shouldLoop ? 'text-amber-700' : 'text-emerald-700'">
            {{ String(shouldLoop) }}
          </span>
        </div>

        <div class="text-slate-400 font-medium mt-2">message</div>
        <div
          class="text-[11px] bg-white/70 px-2 py-1 rounded border border-slate-100 whitespace-pre-wrap"
        >
          {{ message || '(空)' }}
        </div>

        <div v-if="shouldLoop" class="text-[10px] text-amber-600 mt-1">
          说明：本轮证据不足，会回到“规划节点”继续检索（最多 {{ maxIterations }} 轮）。
        </div>
        <div v-else class="text-[10px] text-emerald-600 mt-1">
          说明：证据足够，message 即最终答案。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeBlock } from '@renderer/stores/ai-chat/chat-message/types'
import { useKnowledgeQaConfigStore } from '@renderer/stores/ai-chat/LangchainAgent-Config/knowledge-qa'

const props = defineProps<{
  nodeBlock: NodeBlock
}>()

const knowledgeQaConfigStore = useKnowledgeQaConfigStore()

const isDone = computed(() => Boolean(props.nodeBlock.result))
const isError = computed(() => Boolean(props.nodeBlock.error))

const statusLabel = computed(() => {
  if (isError.value) return '总结失败'
  if (isDone.value) return '总结完成'
  return '总结中'
})

const errorMessage = computed(() => {
  return props.nodeBlock.error?.error?.message || '未知错误'
})

const outputs = computed(() => (props.nodeBlock.result?.outputs ?? {}) as any)

const shouldLoop = computed(() => Boolean(outputs.value?.shouldLoop))

const message = computed(() => {
  const value = outputs.value?.message
  return typeof value === 'string' ? value : ''
})

const headerTextClass = computed(() => {
  if (isError.value) return 'text-rose-700'
  if (!isDone.value) return 'text-slate-600'
  return shouldLoop.value ? 'text-amber-700' : 'text-emerald-700'
})

// 模型 ID
const modelId = computed(() => {
  return props.nodeBlock.start?.modelId || props.nodeBlock.result?.modelId || null
})

// 当前轮次（从 0 开始）
const currentIteration = computed(() => {
  const iter = props.nodeBlock.start?.inputs?.iteration
  return typeof iter === 'number' ? iter : 0
})

// 最大轮次（优先从 inputs 读取，回退到 store）
const maxIterations = computed(() => {
  const fromInputs = props.nodeBlock.start?.inputs?.maxIterations
  if (typeof fromInputs === 'number') return fromInputs
  return knowledgeQaConfigStore.config.graph.maxIterations ?? 3
})

// 轮次显示文本
const iterationText = computed(() => {
  return `${currentIteration.value} / ${maxIterations.value - 1}`
})

const iterationLabel = computed(() => {
  const current = currentIteration.value
  return current === 0 ? '首轮' : `第 ${current + 1} 轮`
})
</script>
