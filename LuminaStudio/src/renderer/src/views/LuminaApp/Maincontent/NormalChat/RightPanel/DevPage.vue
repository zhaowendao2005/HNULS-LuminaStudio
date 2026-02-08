<template>
  <div class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
    <button
      :disabled="isRunning"
      :class="[
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
        isRunning
          ? 'bg-indigo-100 border-indigo-200 text-indigo-400 cursor-not-allowed'
          : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 active:scale-[0.98]'
      ]"
      @click="runAllComponentCases"
    >
      <span class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
        <svg
          v-if="!isRunning"
          class="w-4 h-4 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 3l14 9-14 9V3z" />
        </svg>
        <div
          v-else
          class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"
        />
      </span>
      <div class="text-left">
        <div>{{ isRunning ? '调试运行中...' : '调试全部 MessageComponents' }}</div>
        <div v-if="progress" class="text-[10px] text-indigo-400 mt-0.5">{{ progress }}</div>
        <div v-else class="text-[10px] text-indigo-400/70 mt-0.5">
          依次拼接所有消息组件示例
        </div>
      </div>
    </button>

    <div class="text-xs text-slate-400 px-1">自动发现 {{ cases.length }} 个组件示例</div>

    <div class="grid grid-cols-1 gap-2">
      <button
        v-for="item in cases"
        :key="item.id"
        :disabled="isRunning"
        class="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/60 transition-colors disabled:opacity-60"
        @click="runComponentCase(item.id)"
      >
        <div class="text-xs font-semibold text-slate-700">{{ item.label }}</div>
        <div class="text-[11px] text-slate-400 mt-0.5">{{ item.description }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessageComponentsDev } from '@renderer/composables/ai-chat/useMessageComponentsDev'

const { isRunning, progress, cases, runComponentCase, runAllComponentCases } =
  useMessageComponentsDev()
</script>
