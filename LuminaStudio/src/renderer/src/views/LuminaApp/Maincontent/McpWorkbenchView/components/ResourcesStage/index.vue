<template>
  <section class="flex min-h-0 flex-1 overflow-hidden">
    <div class="w-80 shrink-0 border-r border-slate-200 bg-white">
      <PanelHeader title="可用 Resources" :count="state.resources.length" />
      <div class="overflow-auto">
        <button
          v-for="resource in state.resources"
          :key="resource.uri"
          class="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
          :class="state.selectedResourceUri === resource.uri ? 'bg-cyan-50/50' : ''"
          @click="$emit('select-resource', resource.uri)"
        >
          <div class="text-[13px] font-medium text-slate-900">{{ resource.name }}</div>
          <div class="mt-1 truncate text-[11px] font-mono text-cyan-700">
            {{ resource.uri }}
          </div>
        </button>
      </div>
    </div>

    <div class="min-w-0 flex-1 bg-slate-50/40">
      <InspectorTabs
        :model-value="state.resourcesMode"
        visual-label="内容预览"
        raw-label="原始元数据"
        @update:model-value="$emit('change-resources-mode', $event)"
      />
      <div class="h-[calc(100%-45px)] overflow-auto p-4">
        <div v-if="state.resourcesMode === 'visual'" class="space-y-4">
          <div
            class="flex items-center gap-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <InfoCard label="MIME Type" :value="activeResource?.mimeType || '-'" mono />
            <InfoCard label="URI" :value="activeResource?.uri || '-'" mono />
          </div>

          <button
            class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            @click="$emit('load-resource')"
          >
            读取 Resource
          </button>

          <pre
            v-if="state.resourceResult"
            class="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm"
            >{{ JSON.stringify(state.resourceResult, null, 2) }}</pre
          >
        </div>

        <pre
          v-else
          class="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm"
          >{{ JSON.stringify(activeResource, null, 2) }}</pre
        >
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { McpInspectorMode, McpWorkbenchState } from '@renderer/stores/mcp/types'
import type { McpResourceSummary } from '@preload/types'
import InfoCard from '../InfoCard.vue'
import InspectorTabs from '../InspectorTabs.vue'
import PanelHeader from '../PanelHeader.vue'

defineProps<{
  state: McpWorkbenchState
  activeResource: McpResourceSummary | null
}>()

defineEmits<{
  'select-resource': [uri: string]
  'change-resources-mode': [mode: McpInspectorMode]
  'load-resource': []
}>()
</script>
