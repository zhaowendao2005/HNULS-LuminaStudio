<template>
  <section
    class="of-generator-model-panel rounded-3xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm"
  >
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-indigo-950">阶段模型</h3>
      <button
        type="button"
        class="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
        @click="$emit('save')"
      >
        保存
      </button>
    </div>
    <div class="space-y-3">
      <div v-for="phase in orderedPhases" :key="phase" class="rounded-2xl bg-white/90 p-3">
        <div class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {{ phaseLabelMap[phase] }}
        </div>
        <input
          :value="models[phase]?.model || ''"
          class="w-full rounded-xl border border-indigo-200 px-3 py-2 text-sm text-slate-800 outline-none"
          placeholder="模型名称"
          @input="$emit('update:model', phase, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OFGenerationPhase, OFGenerationPhaseModelConfig } from '@shared/Orchestraflow-types'

defineProps<{
  models: Record<OFGenerationPhase, OFGenerationPhaseModelConfig>
}>()

defineEmits<{
  (e: 'save'): void
  (e: 'update:model', phase: OFGenerationPhase, value: string): void
}>()

const orderedPhases: OFGenerationPhase[] = ['plan', 'wire', 'config', 'validate']

const phaseLabelMap: Record<OFGenerationPhase, string> = {
  plan: '规划',
  wire: '连线',
  config: '配置',
  validate: '校验'
}
</script>
