<template>
  <section class="flex min-h-0 flex-1 overflow-hidden">
    <div class="w-72 shrink-0 border-r border-slate-200 bg-white">
      <PanelHeader title="可用工具" :count="state.tools.length" />
      <div class="overflow-auto">
        <button
          v-for="tool in state.tools"
          :key="tool.name"
          class="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
          :class="state.selectedToolName === tool.name ? 'bg-cyan-50/50' : ''"
          @click="$emit('select-tool', tool.name)"
        >
          <div
            class="text-[13px] font-mono"
            :class="
              state.selectedToolName === tool.name
                ? 'font-semibold text-cyan-700'
                : 'text-slate-800'
            "
          >
            {{ tool.name }}
          </div>
          <div class="mt-1 truncate text-[11px] text-slate-500">
            {{ tool.description || 'No description' }}
          </div>
        </button>
      </div>
    </div>

    <div class="flex min-w-0 flex-1">
      <div class="min-w-0 flex-1 border-r border-slate-200 bg-slate-50/40">
        <InspectorTabs
          :model-value="state.toolsMode"
          visual-label="可视化视图"
          raw-label="原始 Schema"
          @update:model-value="$emit('change-tools-mode', $event)"
        />
        <div class="h-[calc(100%-45px)] overflow-auto p-4">
          <SchemaTree
            v-if="state.toolsMode === 'visual' && activeTool?.inputSchema"
            name="[root]"
            :schema="activeTool.inputSchema"
          />
          <pre
            v-else
            class="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm"
            >{{ JSON.stringify(activeTool?.inputSchema ?? {}, null, 2) }}</pre
          >
        </div>
      </div>

      <div
        class="group relative flex shrink-0 bg-slate-50/70 transition-all"
        :style="{ width: `${rightPanelWidth}px` }"
      >
        <div
          class="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent transition-colors hover:bg-cyan-500/30"
          :class="{ 'bg-cyan-500/50': isDragging }"
          @mousedown="$emit('start-resize', $event)"
        />
        <div class="flex-1 overflow-hidden">
          <PanelHeader title="LLM 实际读取视角" />
          <div class="h-[calc(100%-45px)] space-y-4 overflow-auto p-4">
            <p class="text-xs leading-5 text-slate-500">
              这是客户端基于 descriptor 里的 schema 拼出的提示文本预览。
            </p>
            <pre
              class="whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-xs leading-6 text-slate-200 shadow-inner"
              >{{ toolPromptPreview }}</pre
            >
            <div class="border-l-2 border-amber-400 pl-3">
              <div class="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                调优建议
              </div>
              <p class="mt-1 text-xs leading-5 text-amber-700/80">{{ toolHint }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { McpToolSummary } from '@preload/types'
import type { McpInspectorMode, McpWorkbenchState } from '@renderer/stores/mcp/types'
import InspectorTabs from '../InspectorTabs.vue'
import PanelHeader from '../PanelHeader.vue'
import SchemaTree from '../SchemaTree.vue'

defineProps<{
  state: McpWorkbenchState
  activeTool: McpToolSummary | null
  rightPanelWidth: number
  isDragging: boolean
  toolPromptPreview: string
  toolHint: string
}>()

defineEmits<{
  'select-tool': [name: string]
  'change-tools-mode': [mode: McpInspectorMode]
  'start-resize': [event: MouseEvent]
}>()
</script>
