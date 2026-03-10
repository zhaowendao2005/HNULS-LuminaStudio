<template>
  <section
    class="of-generator-prompt-panel rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm"
  >
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-900">Prompt</h3>
      <button
        type="button"
        class="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
        @click="$emit('send')"
      >
        Generate
      </button>
    </div>
    <textarea
      :model-value="modelValue"
      class="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald-300"
      placeholder="Describe the workflow you want to generate..."
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div class="mt-4">
      <h4 class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Checkpoints
      </h4>
      <div class="space-y-2">
        <button
          v-for="checkpoint in checkpoints"
          :key="checkpoint.id"
          type="button"
          class="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:border-amber-300 hover:bg-amber-50"
          @click="$emit('rollback', checkpoint.id)"
        >
          <span>{{ checkpoint.label }}</span>
          <span>{{ checkpoint.phase }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OFGenerationCheckpoint } from '@shared/Orchestraflow-types'

defineProps<{
  modelValue: string
  checkpoints: OFGenerationCheckpoint[]
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'send'): void
  (e: 'rollback', checkpointId: string): void
}>()
</script>
