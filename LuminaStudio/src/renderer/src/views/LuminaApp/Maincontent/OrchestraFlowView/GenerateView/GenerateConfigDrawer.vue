<template>
  <div
    v-if="visible"
    class="gv-config-v66 fixed inset-0 z-40 flex justify-end bg-slate-950/30"
    @click.self="$emit('close')"
  >
    <div class="h-full w-full max-w-[360px] border-l border-slate-200 bg-white p-5">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <div class="text-sm font-semibold text-slate-900">阶段配置</div>
          <div class="text-xs text-slate-500">当前阶段模型上下文与预算</div>
        </div>
        <button type="button" class="text-sm text-slate-500" @click="$emit('close')">关闭</button>
      </div>

      <label class="mb-3 block text-sm text-slate-700">
        Memory Rounds
        <input
          type="number"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          :value="config.memoryRounds"
          @input="$emit('update:memory-rounds', Number(($event.target as HTMLInputElement).value))"
        />
      </label>
      <label class="mb-3 block text-sm text-slate-700">
        Max Repair Iterations
        <input
          type="number"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          :value="config.maxRepairIterations"
          @input="
            $emit('update:max-repair-iterations', Number(($event.target as HTMLInputElement).value))
          "
        />
      </label>
      <label class="block text-sm text-slate-700">
        Budget Limit Tokens
        <input
          type="number"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          :value="config.budgetLimitTokens"
          @input="$emit('update:budget-limit-tokens', Number(($event.target as HTMLInputElement).value))"
        />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GenerationStageConfig } from '@preload/types'

defineProps<{
  visible: boolean
  config: GenerationStageConfig
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'update:memory-rounds', value: number): void
  (e: 'update:max-repair-iterations', value: number): void
  (e: 'update:budget-limit-tokens', value: number): void
}>()
</script>
