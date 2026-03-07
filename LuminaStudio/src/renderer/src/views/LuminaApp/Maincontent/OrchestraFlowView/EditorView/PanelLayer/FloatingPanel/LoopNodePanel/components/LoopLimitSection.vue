<template>
  <section class="space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
    <div class="system-sm-semibold-uppercase text-gray-700">最大循环次数</div>
    <input
      :value="modelValue"
      type="number"
      min="1"
      class="h-10 w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-sm text-gray-800 outline-none focus:bg-white"
      :class="theme.controlFocusClass"
      @input="emit('update:modelValue', Math.max(1, Number(($event.target as HTMLInputElement).value || 1)))"
    />
  </section>
</template>

<script setup lang="ts">
import type { OFPanelTheme } from '../../panel-theme'

defineProps<{
  modelValue: number
  theme: OFPanelTheme
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>
