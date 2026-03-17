<template>
  <div
    class="absolute right-0 top-0 flex items-center gap-1 rounded-md border border-gray-200 bg-white/95 px-1.5 py-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
  >
    <button
      type="button"
      class="rounded px-2 py-1 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
      @click="$emit('copy')"
    >
      复制
    </button>
    <button
      type="button"
      class="rounded px-2 py-1 text-[10px] font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
      @click="$emit('inspect')"
    >
      查看详情
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'copy'): void
  (e: 'inspect'): void
}>()
</script>
