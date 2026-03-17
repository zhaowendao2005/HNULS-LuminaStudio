<template>
  <section class="flex min-h-0 flex-1 overflow-hidden bg-white">
    <div class="w-1/2 min-w-0 border-r border-slate-200 p-4">
      <div class="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        调用参数
      </div>

      <div v-if="activeTool?.inputSchema && visualToolFields.length" class="space-y-4">
        <div
          v-for="field in visualToolFields"
          :key="field.name"
          class="border-l-2 pl-3"
          :class="field.required ? 'border-emerald-500' : 'border-cyan-500'"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-slate-900">{{ field.name }}</span>
            <span v-if="field.required" class="text-[10px] font-semibold uppercase text-rose-600">
              Required
            </span>
          </div>

          <input
            v-if="field.kind === 'string' || field.kind === 'number'"
            :value="toolArgs[field.name] ?? ''"
            class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            @input="updateToolArg(field.name, ($event.target as HTMLInputElement).value)"
          />

          <WhiteSelect
            v-else-if="field.kind === 'enum'"
            :model-value="toolArgs[field.name] ?? ''"
            :options="
              (field.options || []).map((opt) => ({ label: String(opt), value: String(opt) }))
            "
            @update:model-value="updateToolArg(field.name, String($event))"
          />

          <WhiteSelect
            v-else-if="field.kind === 'boolean'"
            :model-value="toolArgs[field.name] ?? ''"
            :options="booleanOptions"
            @update:model-value="updateToolArg(field.name, String($event))"
          />

          <textarea
            v-else
            :value="toolArgs[field.name] ?? ''"
            rows="3"
            class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
            @input="updateToolArg(field.name, ($event.target as HTMLTextAreaElement).value)"
          />

          <p v-if="field.description" class="mt-1 text-xs text-slate-500">
            {{ field.description }}
          </p>
        </div>
      </div>

      <div v-else>
        <div class="mb-2 text-sm font-medium text-slate-700">原始 JSON 参数</div>
      </div>

      <textarea
        :value="rawToolArgs"
        rows="12"
        class="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs outline-none focus:border-cyan-500"
        @input="emit('update:raw-tool-args', ($event.target as HTMLTextAreaElement).value)"
      />

      <button
        class="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        @click="$emit('execute-tool')"
      >
        执行调用
      </button>
    </div>

    <div class="w-1/2 min-w-0 bg-slate-50/40 p-4">
      <div class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        LLM 接收的响应
      </div>
      <p class="mb-4 text-xs text-slate-500">这里展示 `role=tool` 语义下的原始结果。</p>
      <pre
        class="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm"
        >{{ JSON.stringify(state.toolResult, null, 2) }}</pre
      >
    </div>
  </section>
</template>

<script setup lang="ts">
import type { McpToolSummary } from '@preload/types'
import WhiteSelect, { type WhiteSelectOption } from '@renderer/components/WhiteSelect/index.vue'
import type { McpWorkbenchState } from '@renderer/stores/mcp/types'

interface VisualToolField {
  name: string
  required: boolean
  description: string
  kind: 'enum' | 'boolean' | 'number' | 'json' | 'string'
  options: string[]
}

const props = defineProps<{
  toolArgs: Record<string, string>
  rawToolArgs: string
  state: McpWorkbenchState
  activeTool: McpToolSummary | null
  visualToolFields: VisualToolField[]
  booleanOptions: Array<WhiteSelectOption<string>>
}>()

const emit = defineEmits<{
  'update:tool-args': [toolArgs: Record<string, string>]
  'update:raw-tool-args': [value: string]
  'execute-tool': []
}>()

function updateToolArg(name: string, value: string): void {
  emit('update:tool-args', {
    ...props.toolArgs,
    [name]: value
  })
}
</script>
