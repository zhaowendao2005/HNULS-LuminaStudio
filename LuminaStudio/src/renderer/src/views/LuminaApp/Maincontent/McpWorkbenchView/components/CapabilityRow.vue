<template>
  <div
    class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
  >
    <span class="text-sm font-medium text-slate-800">{{ label }}</span>
    <span
      class="text-xs font-semibold uppercase"
      :class="active ? 'text-emerald-600' : 'text-slate-400'"
    >
      {{ active ? 'Supported' : 'Unsupported' }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  active: boolean
}>()
</script>
