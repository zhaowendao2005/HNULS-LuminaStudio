<template>
  <div class="gv-validation-g53 rounded-2xl border border-slate-200 bg-white p-4">
    <div class="mb-2 text-sm font-semibold text-slate-900">Validation</div>
    <div
      v-for="item in validations"
      :key="`${item.runId}-${item.report.valid}-${item.report.diagnostics.length}`"
      class="mb-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"
    >
      <div
        class="mb-2 font-semibold"
        :class="item.report.valid ? 'text-emerald-600' : 'text-amber-600'"
      >
        {{ item.report.valid ? '通过' : '未通过' }}
      </div>
      <pre class="whitespace-pre-wrap">{{ JSON.stringify(item.report, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GenerationValidationReportEvent } from '@preload/types'

defineProps<{
  validations: GenerationValidationReportEvent[]
}>()
</script>
