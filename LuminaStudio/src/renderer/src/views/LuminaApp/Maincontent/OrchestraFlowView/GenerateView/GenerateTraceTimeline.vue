<template>
  <div class="gv-trace-h44 rounded-2xl border border-slate-200 bg-white p-4">
    <div class="mb-2 text-sm font-semibold text-slate-900">Trace Timeline</div>
    <div class="max-h-[180px] overflow-y-auto text-xs text-slate-600">
      <div v-for="event in events" :key="`${event.runId}-${event.type}-${Math.random()}`" class="mb-2 border-b border-slate-100 pb-2 last:border-b-0">
        <div class="font-semibold text-slate-800">{{ event.type }}</div>
        <pre class="mt-1 whitespace-pre-wrap">{{ JSON.stringify(event, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GenerationStreamEvent } from '@preload/types'

defineProps<{
  events: GenerationStreamEvent[]
}>()
</script>
