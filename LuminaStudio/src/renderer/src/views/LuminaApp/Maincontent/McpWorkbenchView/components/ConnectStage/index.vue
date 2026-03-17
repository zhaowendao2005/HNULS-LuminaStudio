<template>
  <section class="flex-1 overflow-auto p-6">
    <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">连接预设</h2>
          <button class="text-xs font-medium text-cyan-700" @click="$emit('reset-draft')">
            重置
          </button>
        </div>

        <div class="space-y-3">
          <label class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            名称
          </label>
          <input
            :value="draft.name"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            @input="updateDraftField('name', ($event.target as HTMLInputElement).value)"
          />

          <label class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            传输
          </label>
          <WhiteSelect
            :model-value="draft.transport"
            :options="transportOptions"
            @update:model-value="
              updateDraftField('transport', $event as McpPresetDraft['transport'])
            "
          />

          <template v-if="draft.transport === 'stdio'">
            <label class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              命令
            </label>
            <input
              :value="draft.command"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
              @input="updateDraftField('command', ($event.target as HTMLInputElement).value)"
            />

            <label class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              参数
            </label>
            <textarea
              :value="draft.argsText"
              rows="2"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
              @input="updateDraftField('argsText', ($event.target as HTMLTextAreaElement).value)"
            />

            <label class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              工作目录
            </label>
            <input
              :value="draft.cwd"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
              @input="updateDraftField('cwd', ($event.target as HTMLInputElement).value)"
            />

            <label class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              环境变量(JSON)
            </label>
            <textarea
              :value="draft.envText"
              rows="4"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
              @input="updateDraftField('envText', ($event.target as HTMLTextAreaElement).value)"
            />
          </template>

          <template v-else>
            <label class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              URL
            </label>
            <input
              :value="draft.url"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
              @input="updateDraftField('url', ($event.target as HTMLInputElement).value)"
            />

            <label class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              请求头(JSON)
            </label>
            <textarea
              :value="draft.headersText"
              rows="5"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
              @input="updateDraftField('headersText', ($event.target as HTMLTextAreaElement).value)"
            />
          </template>
        </div>

        <div class="mt-5 flex gap-3">
          <button
            class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            @click="$emit('save-preset')"
          >
            保存预设
          </button>
          <button
            class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
            @click="$emit('connect-draft')"
          >
            连接当前草稿
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            会话与能力协商
          </h2>
          <div class="flex items-center gap-3">
            <span
              class="inline-flex items-center gap-2 text-xs font-semibold"
              :class="state.session.connected ? 'text-emerald-600' : 'text-slate-400'"
            >
              <span
                class="h-2 w-2 rounded-full"
                :class="state.session.connected ? 'bg-emerald-500' : 'bg-slate-300'"
              />
              {{ state.session.connected ? '已连接' : '未连接' }}
            </span>
            <button
              v-if="state.session.connected"
              class="text-xs font-medium text-rose-600"
              @click="$emit('disconnect')"
            >
              断开
            </button>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Server" :value="state.session.serverName || '未连接'" />
          <InfoCard label="Version" :value="state.session.serverVersion || '-'" mono />
          <InfoCard label="Transport" :value="state.session.transport || '-'" mono />
          <InfoCard label="Protocol" :value="state.session.protocolVersion || '-'" mono />
        </div>

        <div class="mt-6 grid gap-3 md:grid-cols-2">
          <CapabilityRow label="Tools" :active="Boolean(state.session.capabilities?.tools)" />
          <CapabilityRow label="Prompts" :active="Boolean(state.session.capabilities?.prompts)" />
          <CapabilityRow
            label="Resources"
            :active="Boolean(state.session.capabilities?.resources)"
          />
          <CapabilityRow label="Logging" :active="Boolean(state.session.capabilities?.logging)" />
        </div>

        <div class="mt-6">
          <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            已保存预设
          </h3>
          <div class="mt-3 space-y-2">
            <div
              v-for="preset in state.presets"
              :key="preset.id"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
            >
              <div>
                <div class="text-sm font-semibold text-slate-900">{{ preset.name }}</div>
                <div class="text-xs text-slate-500">
                  {{ preset.transport === 'stdio' ? preset.command : preset.url }}
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                  @click="$emit('load-preset', preset)"
                >
                  载入
                </button>
                <button
                  class="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white"
                  @click="$emit('connect-preset', preset.id)"
                >
                  连接
                </button>
                <button
                  class="rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600"
                  @click="$emit('delete-preset', preset.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <p
          v-if="state.error"
          class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {{ state.error }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { McpServerPreset } from '@preload/types'
import WhiteSelect, { type WhiteSelectOption } from '@renderer/components/WhiteSelect/index.vue'
import type { McpPresetDraft, McpWorkbenchState } from '@renderer/stores/mcp/types'
import CapabilityRow from '../CapabilityRow.vue'
import InfoCard from '../InfoCard.vue'

const props = defineProps<{
  draft: McpPresetDraft
  state: McpWorkbenchState
  transportOptions: Array<WhiteSelectOption<string>>
}>()

const emit = defineEmits<{
  'reset-draft': []
  'save-preset': []
  'connect-draft': []
  'update:draft': [draft: McpPresetDraft]
  disconnect: []
  'load-preset': [preset: McpServerPreset]
  'connect-preset': [presetId: string]
  'delete-preset': [presetId: string]
}>()

function updateDraftField(key: string, value: string): void {
  const nextDraft = { ...props.draft } as Record<string, string>
  nextDraft[key] = value
  emit('update:draft', nextDraft as unknown as McpPresetDraft)
}
</script>
