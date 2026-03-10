<template>
  <div
    class="of-generator-phase-header rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm"
  >
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="phase in phases"
        :key="phase.key"
        type="button"
        :class="[
          'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
          currentPhase === phase.key
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        ]"
        @click="$emit('advance', phase.key)"
      >
        {{ phase.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OFGenerationPhase } from '@shared/Orchestraflow-types'

defineProps<{
  currentPhase: OFGenerationPhase
}>()

defineEmits<{
  (e: 'advance', phase: OFGenerationPhase): void
}>()

const phases: Array<{ key: OFGenerationPhase; label: string }> = [
  { key: 'plan', label: 'Plan' },
  { key: 'wire', label: 'Wire' },
  { key: 'config', label: 'Config' },
  { key: 'validate', label: 'Validate' }
]
</script>
