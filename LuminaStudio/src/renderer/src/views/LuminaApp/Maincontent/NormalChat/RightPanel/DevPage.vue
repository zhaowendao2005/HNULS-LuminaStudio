<template>
  <div class="flex-1 overflow-y-auto px-4 py-4">
    <button
      :disabled="isRunning"
      :class="[
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
        isRunning
          ? 'bg-indigo-100 border-indigo-200 text-indigo-400 cursor-not-allowed'
          : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 active:scale-[0.98]'
      ]"
      @click="runFullComponentTest"
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
        <div>{{ isRunning ? '测试运行中...' : '调试全组件' }}</div>
        <div v-if="progress" class="text-[10px] text-indigo-400 mt-0.5">{{ progress }}</div>
        <div v-else class="text-[10px] text-indigo-400/70 mt-0.5">
          模拟完整流式对话，覆盖所有消息类型
        </div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useComponentDebug } from '@renderer/composables/ai-chat/useComponentDebug'

const { isRunning, progress, runFullComponentTest } = useComponentDebug()
</script>
