<template>
  <div class="mb-4 w-full">
    <button
      @click="toggleExpanded"
      :class="[
        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 border',
        isExpanded
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
          : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
      ]"
    >
      <div class="relative flex items-center justify-center w-5 h-5">
        <svg
          v-if="!isThinking"
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="m4.93 4.93 2.83 2.83" />
          <path d="m16.24 16.24 2.83 2.83" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
          <path d="m4.93 19.07 2.83-2.83" />
          <path d="m16.24 7.76 2.83-2.83" />
        </svg>
        <div
          v-else
          class="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"
        ></div>
      </div>
      <span>{{ isThinking ? '正在思考...' : '深度思考已完成' }}</span>
      <svg
        :class="[
          'w-3.5 h-3.5 ml-auto opacity-50 transition-transform',
          isExpanded ? 'rotate-180' : ''
        ]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <!-- 思考步骤展开 -->
    <div
      :class="[
        'overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]',
        isExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
      ]"
    >
      <div class="pl-4 border-l-2 border-emerald-100 space-y-3 py-2">
        <div
          v-for="(step, idx) in thinkingSteps"
          :key="step.id"
          class="flex items-start gap-3 text-xs animate-in fade-in"
        >
          <span class="text-emerald-500 font-mono mt-0.5">
            {{ String(idx + 1).padStart(2, '0') }}
          </span>
          <span class="text-slate-600 leading-relaxed">{{ step.content }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  thinkingSteps: Array<{ id: string; content: string }>
  isThinking?: boolean
  messageId: string
}>()

const isExpanded = ref(true) // 默认展开

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>
