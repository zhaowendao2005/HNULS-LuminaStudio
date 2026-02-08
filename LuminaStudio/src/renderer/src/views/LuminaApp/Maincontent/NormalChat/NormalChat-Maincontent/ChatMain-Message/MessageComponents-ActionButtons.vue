<template>
  <div class="mt-3 flex items-center gap-2 text-slate-400">
    <button
      class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
      title="复制"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
    <button
      class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
      title="点赞"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 9V5a3 3 0 0 0-6 0v4" />
        <path d="M5 11h14l-1 9H6l-1-9z" />
      </svg>
    </button>
    <button
      class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
      title="点踩"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path
          d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
// 操作按钮组件，暂无逻辑
</script>
