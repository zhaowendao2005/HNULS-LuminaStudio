<template>
  <div>
    <div class="text-xs text-slate-500">{{ label }}</div>
    <div
      class="mt-2 text-sm font-semibold text-slate-900"
      :class="mono ? 'font-mono text-cyan-700' : ''"
    >
      {{ value }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  mono?: boolean
}>()
</script>
