<template>
  <div class="gv-prompt-t28 rounded-2xl border border-slate-200 bg-white p-4">
    <div class="mb-2 text-sm font-semibold text-slate-900">Prompt / Context</div>
    <div
      v-for="prompt in prompts"
      :key="`${prompt.runId}-${prompt.stepKey}`"
      class="mb-3 last:mb-0"
    >
      <div class="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        {{ prompt.title }}
      </div>
      <pre class="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{{
        prompt.prompt
      }}</pre>
      <pre
        v-if="contexts[prompt.stepKey]"
        class="mt-2 whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-200"
        >{{ contexts[prompt.stepKey].context }}</pre
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GenerationContextSnapshotEvent, GenerationPromptSnapshotEvent } from '@preload/types'

const props = defineProps<{
  prompts: GenerationPromptSnapshotEvent[]
  contextSnapshots: GenerationContextSnapshotEvent[]
}>()

const contexts = computed(() =>
  Object.fromEntries(props.contextSnapshots.map((item) => [item.stepKey, item]))
)
</script>
