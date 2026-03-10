<template>
  <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
    <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{{ title }}</div>
    <div v-if="count !== undefined" class="text-xs text-slate-400">{{ count }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  count?: number
}>()
</script>
