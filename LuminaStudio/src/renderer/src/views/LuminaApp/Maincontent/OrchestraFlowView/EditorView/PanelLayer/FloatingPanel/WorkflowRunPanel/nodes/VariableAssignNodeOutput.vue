<template>
  <div class="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
    <div class="mb-3 flex items-center gap-2">
      <div class="flex h-5 w-5 items-center justify-center rounded bg-sky-500 text-white">
        <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7 7H17M7 12H13M7 17H11M16 12L18 14L22 10"
          />
        </svg>
      </div>
      <div class="system-md-semibold text-gray-900">变量赋值</div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-3">
      <div class="text-xs font-medium uppercase text-gray-500">输出</div>
      <pre class="mt-2 whitespace-pre-wrap break-all text-sm text-gray-700">{{ prettyOutput }}</pre>
    </div>

    <div
      v-if="tracing.error"
      class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      {{ tracing.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OFNodeTracing } from '@shared/Orchestraflow-types'

const props = defineProps<{
  tracing: OFNodeTracing
  allTraces: OFNodeTracing[]
}>()

const prettyOutput = computed(() => {
  try {
    return JSON.stringify(props.tracing.outputs || {}, null, 2)
  } catch {
    return String(props.tracing.outputs || {})
  }
})
</script>
