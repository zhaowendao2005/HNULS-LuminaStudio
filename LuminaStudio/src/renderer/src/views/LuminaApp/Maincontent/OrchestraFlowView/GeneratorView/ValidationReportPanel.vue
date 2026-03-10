<template>
  <section
    class="of-generator-validation-panel rounded-3xl border border-rose-200 bg-white/90 p-4 shadow-sm"
  >
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-900">校验结果</h3>
      <span
        :class="[
          'rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
          report.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        ]"
      >
        {{ report.ok ? '通过' : '阻塞' }}
      </span>
    </div>
    <div class="space-y-2">
      <div
        v-for="issue in report.issues"
        :key="issue.id"
        class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm"
      >
        <div class="font-semibold text-rose-800">{{ issue.type }}</div>
        <div class="mt-1 text-rose-700">{{ issue.message }}</div>
        <div v-if="issue.suggested_action" class="mt-2 text-xs text-rose-600">
          {{ issue.suggested_action }}
        </div>
      </div>
      <div
        v-if="!report.issues.length"
        class="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-6 text-center text-sm text-emerald-700"
      >
        当前没有校验问题。
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OFGenerationValidationReport } from '@shared/Orchestraflow-types'

defineProps<{
  report: OFGenerationValidationReport
}>()
</script>
