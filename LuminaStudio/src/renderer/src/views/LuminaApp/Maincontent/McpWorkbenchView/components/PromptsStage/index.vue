<template>
  <section class="flex min-h-0 flex-1 overflow-hidden">
    <div class="w-72 shrink-0 border-r border-slate-200 bg-white">
      <PanelHeader title="可用 Prompts" :count="state.prompts.length" />
      <div class="overflow-auto">
        <button
          v-for="prompt in state.prompts"
          :key="prompt.name"
          class="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
          :class="state.selectedPromptName === prompt.name ? 'bg-cyan-50/50' : ''"
          @click="$emit('select-prompt', prompt.name)"
        >
          <div
            class="text-[13px] font-mono"
            :class="
              state.selectedPromptName === prompt.name
                ? 'font-semibold text-cyan-700'
                : 'text-slate-800'
            "
          >
            {{ prompt.name }}
          </div>
          <div class="mt-1 truncate text-[11px] text-slate-500">
            {{ prompt.description || 'No description' }}
          </div>
        </button>
      </div>
    </div>

    <div class="min-w-0 flex-1 bg-slate-50/40">
      <InspectorTabs
        :model-value="state.promptsMode"
        visual-label="可视化视图"
        raw-label="原始声明"
        @update:model-value="$emit('change-prompts-mode', $event)"
      />
      <div class="h-[calc(100%-45px)] overflow-auto p-4">
        <div v-if="state.promptsMode === 'visual'" class="space-y-4">
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Description
            </div>
            <p class="mt-2 text-sm text-slate-800">
              {{ activePrompt?.description || 'No description' }}
            </p>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Arguments
            </div>
            <div class="space-y-3">
              <div
                v-for="argument in activePrompt?.arguments || []"
                :key="argument.name"
                class="border-l-2 border-cyan-500 pl-3"
              >
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-slate-900">{{ argument.name }}</span>
                  <span
                    v-if="argument.required"
                    class="text-[10px] font-semibold uppercase text-rose-600"
                  >
                    Required
                  </span>
                </div>
                <p class="mt-1 text-xs text-slate-500">
                  {{ argument.description || 'No description' }}
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Prompt 预览
            </div>
            <div class="space-y-3">
              <div v-for="argument in activePrompt?.arguments || []" :key="argument.name">
                <label
                  class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                >
                  {{ argument.name }}
                </label>
                <input
                  :value="promptArgs[argument.name] ?? ''"
                  class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                  @input="updatePromptArg(argument.name, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
            <button
              class="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              @click="$emit('render-prompt')"
            >
              渲染 Prompt
            </button>
            <pre
              v-if="state.promptResult"
              class="mt-4 rounded-xl bg-slate-900 p-4 text-xs text-slate-200"
              >{{ JSON.stringify(state.promptResult, null, 2) }}</pre
            >
          </div>
        </div>

        <pre
          v-else
          class="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm"
          >{{ JSON.stringify(activePrompt, null, 2) }}</pre
        >
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { McpPromptSummary } from '@preload/types'
import type { McpInspectorMode, McpWorkbenchState } from '@renderer/stores/mcp/types'
import InspectorTabs from '../InspectorTabs.vue'
import PanelHeader from '../PanelHeader.vue'

const props = defineProps<{
  promptArgs: Record<string, string>
  state: McpWorkbenchState
  activePrompt: McpPromptSummary | null
}>()

const emit = defineEmits<{
  'select-prompt': [name: string]
  'change-prompts-mode': [mode: McpInspectorMode]
  'update:prompt-args': [promptArgs: Record<string, string>]
  'render-prompt': []
}>()

function updatePromptArg(name: string, value: string): void {
  emit('update:prompt-args', {
    ...props.promptArgs,
    [name]: value
  })
}
</script>
