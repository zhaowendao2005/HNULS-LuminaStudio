<template>
  <section
    class="nc-agent-trace-json-section-a9k2 rounded-2xl border border-gray-200 bg-white px-4 py-4"
  >
    <div class="mb-3">
      <h3 class="text-[14px] font-semibold text-gray-900">{{ title }}</h3>
      <p v-if="description" class="mt-1 text-[12px] leading-5 text-gray-500">{{ description }}</p>
    </div>

    <pre
      class="overflow-x-auto rounded-xl bg-[#0f172a] px-4 py-3 text-[12px] leading-6 text-slate-100"
      >{{ jsonText }}</pre
    >
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    value: unknown
    description?: string
  }>(),
  {
    description: ''
  }
)

const jsonText = computed(() => {
  try {
    return JSON.stringify(props.value ?? null, null, 2)
  } catch {
    return String(props.value ?? '')
  }
})
</script>
