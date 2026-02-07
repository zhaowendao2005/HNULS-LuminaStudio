<template>
  <div class="space-y-4">
    <!-- Knowledge-Qa Card -->
    <div
      class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
    >
      <!-- Background (Abstract Gradient) -->
      <div
        class="absolute inset-0 opacity-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 pointer-events-none"
      ></div>

      <div class="relative z-10">
        <div class="flex items-center gap-2 mb-2">
          <div class="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h3 class="font-semibold text-slate-800 text-sm">Knowledge-Qa</h3>
        </div>

        <p class="text-xs text-slate-500 mb-3 leading-relaxed">
          基于知识库的问答Agent。包含规划、检索、总结与判断节点，支持多轮迭代优化回答质量。
        </p>

        <button
          @click="$emit('open-config', 'knowledge-qa')"
          class="w-full py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <svg
            class="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          配置参数
        </button>
      </div>
    </div>

    <!-- Future Cards Placeholder -->
    <div class="border border-dashed border-slate-200 rounded-xl p-4 text-center">
      <p class="text-xs text-slate-400">更多 Agent 正在开发中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'open-config', type: string): void
}>()
</script>
