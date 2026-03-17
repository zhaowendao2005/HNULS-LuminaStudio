<template>
  <aside class="w-[220px] shrink-0 border-r border-slate-200 bg-slate-50/70 px-2 py-3">
    <div class="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      LLM 视角阶段
    </div>
    <nav class="space-y-1">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors"
        :class="
          activeStage === tab.id
            ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
            : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900'
        "
        @click="$emit('change-stage', tab.id)"
      >
        <span class="w-4 text-[11px] font-bold text-slate-400">{{ tab.num }}</span>
        <span class="flex-1 text-[13px] font-medium">{{ tab.label }}</span>
        <span class="h-1.5 w-1.5 rounded-full" :class="getTabStatusClass(tab.id)" />
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import type { McpStage } from '@renderer/stores/mcp/types'

interface StageTabItem {
  id: McpStage
  num: string
  label: string
}

defineProps<{
  tabs: readonly StageTabItem[]
  activeStage: McpStage
  getTabStatusClass: (tabId: string) => string
}>()

defineEmits<{
  'change-stage': [stage: McpStage]
}>()
</script>
