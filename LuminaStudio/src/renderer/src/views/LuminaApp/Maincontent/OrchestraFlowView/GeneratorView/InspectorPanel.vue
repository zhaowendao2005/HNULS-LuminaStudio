<template>
  <section
    class="of-generator-inspector-panel rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm"
  >
    <h3 class="mb-3 text-sm font-semibold text-slate-900">Graph Summary</h3>
    <dl class="grid grid-cols-2 gap-3 text-sm text-slate-700">
      <div class="rounded-2xl bg-slate-50 p-3">
        <dt class="text-xs uppercase tracking-[0.14em] text-slate-500">Nodes</dt>
        <dd class="mt-1 text-lg font-semibold text-slate-900">{{ summary.node_count }}</dd>
      </div>
      <div class="rounded-2xl bg-slate-50 p-3">
        <dt class="text-xs uppercase tracking-[0.14em] text-slate-500">Edges</dt>
        <dd class="mt-1 text-lg font-semibold text-slate-900">{{ summary.edge_count }}</dd>
      </div>
    </dl>
    <div class="mt-4 rounded-2xl bg-slate-50 p-3">
      <div class="mb-2 text-xs uppercase tracking-[0.14em] text-slate-500">Namespaces</div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="item in summary.namespaces"
          :key="item"
          class="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
        >
          {{ item }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OFGenerationGraphSummary } from '@shared/Orchestraflow-types'

defineProps<{
  summary: OFGenerationGraphSummary
}>()
</script>
