<template>
  <section
    class="of-generator-plan-panel rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm"
  >
    <h3 class="mb-3 text-sm font-semibold text-emerald-900">规划预览</h3>
    <div class="space-y-3">
      <div
        v-for="item in items"
        :key="item.id"
        class="rounded-2xl border border-emerald-200 bg-white/90 px-3 py-3"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-semibold text-slate-900">{{ item.title }}</div>
          <span
            class="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700"
          >
            {{ item.status }}
          </span>
        </div>
        <p class="mt-2 text-sm text-slate-600">{{ item.detail }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OFGenerationPlanItem } from '@shared/Orchestraflow-types'

defineProps<{
  items: OFGenerationPlanItem[]
}>()
</script>
