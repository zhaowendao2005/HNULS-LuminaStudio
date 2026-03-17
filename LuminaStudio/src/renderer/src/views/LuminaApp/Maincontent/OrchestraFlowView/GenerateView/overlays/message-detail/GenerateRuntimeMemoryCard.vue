<template>
  <div class="gv-memory-w81 rounded-2xl border border-slate-200 bg-white p-4">
    <div class="mb-2 text-sm font-semibold text-slate-900">Memory / Budget</div>
    <pre class="mb-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{{
      memoryJson
    }}</pre>
    <pre class="whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-200">{{
      budgetJson
    }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GenerationBudgetEvent, GenerationMemorySnapshotEvent } from '@preload/types'

const props = defineProps<{
  memories: GenerationMemorySnapshotEvent[]
  budgets: GenerationBudgetEvent[]
}>()

const memoryJson = computed(() => JSON.stringify(props.memories, null, 2))
const budgetJson = computed(() => JSON.stringify(props.budgets, null, 2))
</script>
