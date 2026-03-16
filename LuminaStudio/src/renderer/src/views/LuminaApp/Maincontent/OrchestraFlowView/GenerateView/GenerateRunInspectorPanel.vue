<template>
  <aside class="gv-inspector-q65 flex h-full w-[360px] flex-col gap-3 border-l border-slate-200 bg-slate-50 p-4">
    <div>
      <div class="text-sm font-semibold text-slate-900">运行详情</div>
      <div class="text-xs text-slate-500">流式查看 prompt、上下文、memory、校验和预算。</div>
    </div>
    <div v-if="run">
      <GenerateTraceTimeline :events="run.events" />
      <div class="mt-3">
        <GeneratePromptSnapshotCard :prompts="run.prompts" :context-snapshots="run.contexts" />
      </div>
      <div class="mt-3">
        <GenerateValidationTraceCard :validations="run.validations" />
      </div>
      <div class="mt-3">
        <GenerateRuntimeMemoryCard :memories="run.memories" :budgets="run.budgets" />
      </div>
    </div>
    <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
      还没有运行记录。
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { RunInspectorRecord } from '@renderer/stores/orchestraflow/generation-editor/inspector/run-inspector.types'
import GeneratePromptSnapshotCard from './GeneratePromptSnapshotCard.vue'
import GenerateRuntimeMemoryCard from './GenerateRuntimeMemoryCard.vue'
import GenerateTraceTimeline from './GenerateTraceTimeline.vue'
import GenerateValidationTraceCard from './GenerateValidationTraceCard.vue'

defineProps<{
  run: RunInspectorRecord | null
}>()
</script>
