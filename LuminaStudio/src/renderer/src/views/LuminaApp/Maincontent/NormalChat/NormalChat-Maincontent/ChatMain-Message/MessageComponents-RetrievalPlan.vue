<template>
  <!--
    RetrievalPlanMessage

    这个组件专门用于渲染 nodeKind = 'retrieval_plan' 的节点。

    对小白的理解方式：
    - 规划节点 = “AI 先想清楚应该怎么搜”
    - 它会输出多条检索 query，以及每条 query 取多少条结果（k）
  -->
  <div
    :class="[
      'border rounded-xl px-3 py-2.5 text-xs transition-all',
      isError
        ? 'bg-rose-50 border-rose-200'
        : isDone
          ? 'bg-indigo-50 border-indigo-200'
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
        v-else-if="isDone && !isError"
        class="w-4 h-4 text-indigo-600"
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

      <span :class="isError ? 'text-rose-700' : 'text-indigo-700'">
        {{ statusLabel }}: 检索规划
      </span>
      <span v-if="modelId" class="text-[10px] text-slate-400 font-normal">({{ modelId }})</span>
    </div>

    <!-- Body -->
    <div class="pl-6 text-slate-700 space-y-2">
      <!-- Error -->
      <div v-if="isError" class="text-rose-600">⚠️ {{ errorMessage }}</div>

      <!-- Inputs (debug / explain) -->
      <div class="space-y-1">
        <div class="text-slate-400 font-medium">本轮输入</div>
        <div class="text-[11px] bg-white/70 px-2 py-1 rounded border border-slate-100">
          {{ planningInput || '(空)' }}
        </div>
      </div>

      <!-- Outputs -->
      <div v-if="isDone" class="space-y-1">
        <div class="text-slate-400 font-medium">规划结果</div>

        <div class="text-[11px] text-slate-600">maxK: {{ maxK }}</div>

        <div v-if="rationale" class="text-[11px] text-slate-600">rationale: {{ rationale }}</div>

        <div v-if="queries.length" class="space-y-1.5">
          <div class="text-[10px] text-slate-500">queries（最多 10 条）</div>
          <div class="space-y-1">
            <div
              v-for="(q, idx) in queries"
              :key="idx"
              class="bg-white/70 px-2 py-1 rounded border border-slate-100"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="font-mono text-[11px] text-slate-800 break-words">{{ q.query }}</div>
                <div class="text-[10px] text-indigo-600 flex-shrink-0">k={{ q.k }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-[11px] text-slate-400">（暂无 queries）</div>
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

// ==================== 状态计算 ====================

// 规划节点完成：只要 node-result 到达，就认为 done
const isDone = computed(() => Boolean(props.nodeBlock.result))

// 规划节点失败：node-error 到达就认为 error
const isError = computed(() => Boolean(props.nodeBlock.error))

const statusLabel = computed(() => {
  if (isError.value) return '规划失败'
  if (isDone.value) return '规划完成'
  return '规划中'
})

const errorMessage = computed(() => {
  return props.nodeBlock.error?.error?.message || '未知错误'
})

// ==================== 数据提取（inputs / outputs）====================

// planningInput 在 node-start.inputs 里
const planningInput = computed(() => {
  const inputs = props.nodeBlock.start?.inputs as any
  return typeof inputs?.planningInput === 'string' ? inputs.planningInput : ''
})

// 规划输出在 node-result.outputs 里（graph.ts 里直接把 plan 的字段铺平输出）
const outputs = computed(() => (props.nodeBlock.result?.outputs ?? {}) as any)

const maxK = computed(() => {
  const value = outputs.value?.maxK
  return typeof value === 'number' ? value : 3
})

const rationale = computed(() => {
  const value = outputs.value?.rationale
  return typeof value === 'string' ? value : ''
})

const queries = computed(() => {
  const list = outputs.value?.queries
  if (!Array.isArray(list)) return []
  return list
    .map((q: any) => ({
      query: String(q?.query ?? ''),
      k: Number.isFinite(q?.k) ? q.k : maxK.value
    }))
    .filter((q: any) => q.query.trim())
})

// 模型 ID
const modelId = computed(() => {
  return props.nodeBlock.start?.modelId || props.nodeBlock.result?.modelId || null
})
</script>
