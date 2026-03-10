<template>
  <div class="flex gap-4 border-b border-slate-100 px-4 text-xs font-medium">
    <button
      class="border-b-2 py-2"
      :class="
        modelValue === 'visual'
          ? 'border-slate-900 text-slate-900'
          : 'border-transparent text-slate-500'
      "
      @click="$emit('update:modelValue', 'visual')"
    >
      {{ visualLabel }}
    </button>
    <button
      class="border-b-2 py-2"
      :class="
        modelValue === 'raw'
          ? 'border-slate-900 text-slate-900'
          : 'border-transparent text-slate-500'
      "
      @click="$emit('update:modelValue', 'raw')"
    >
      {{ rawLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  visualLabel: string
  rawLabel: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: 'visual' | 'raw'): void
}>()
</script>
