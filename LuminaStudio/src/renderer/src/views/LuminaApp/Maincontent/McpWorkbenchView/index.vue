<template>
  <div
    class="ls-mcp-workbench relative flex h-full flex-col overflow-hidden bg-white text-slate-900"
  >
    <div class="flex flex-1 overflow-hidden">
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
              store.state.activeStage === tab.id
                ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
                : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900'
            "
            @click="store.state.activeStage = tab.id"
          >
            <span class="w-4 text-[11px] font-bold text-slate-400">{{ tab.num }}</span>
            <span class="flex-1 text-[13px] font-medium">{{ tab.label }}</span>
            <span class="h-1.5 w-1.5 rounded-full" :class="tabStatusClass(tab.id)" />
          </button>
        </nav>
      </aside>

      <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <section v-if="store.state.activeStage === 'connect'" class="flex-1 overflow-auto p-6">
          <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  连接预设
                </h2>
                <button class="text-xs font-medium text-cyan-700" @click="resetDraft">重置</button>
              </div>
              <div class="space-y-3">
                <label
                  class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                >
                  名称
                </label>
                <input
                  v-model="draft.name"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
                <label
                  class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                >
                  传输
                </label>
                <select
                  v-model="draft.transport"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                >
                  <option value="stdio">STDIO</option>
                  <option value="streamable-http">Streamable HTTP</option>
                </select>
                <template v-if="draft.transport === 'stdio'">
                  <label
                    class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    命令
                  </label>
                  <input
                    v-model="draft.command"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
                  />
                  <label
                    class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    参数
                  </label>
                  <textarea
                    v-model="draft.argsText"
                    rows="2"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
                  />
                  <label
                    class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    工作目录
                  </label>
                  <input
                    v-model="draft.cwd"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
                  />
                  <label
                    class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    环境变量(JSON)
                  </label>
                  <textarea
                    v-model="draft.envText"
                    rows="4"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
                  />
                </template>
                <template v-else>
                  <label
                    class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    URL
                  </label>
                  <input
                    v-model="draft.url"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
                  />
                  <label
                    class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    请求头(JSON)
                  </label>
                  <textarea
                    v-model="draft.headersText"
                    rows="5"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
                  />
                </template>
              </div>
              <div class="mt-5 flex gap-3">
                <button
                  class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  @click="handleSavePreset"
                >
                  保存预设
                </button>
                <button
                  class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                  @click="connectDraft"
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
                    :class="store.state.session.connected ? 'text-emerald-600' : 'text-slate-400'"
                  >
                    <span
                      class="h-2 w-2 rounded-full"
                      :class="store.state.session.connected ? 'bg-emerald-500' : 'bg-slate-300'"
                    />
                    {{ store.state.session.connected ? '已连接' : '未连接' }}
                  </span>
                  <button
                    v-if="store.state.session.connected"
                    class="text-xs font-medium text-rose-600"
                    @click="store.disconnect"
                  >
                    断开
                  </button>
                </div>
              </div>
              <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Server" :value="store.state.session.serverName || '未连接'" />
                <InfoCard label="Version" :value="store.state.session.serverVersion || '-'" mono />
                <InfoCard label="Transport" :value="store.state.session.transport || '-'" mono />
                <InfoCard
                  label="Protocol"
                  :value="store.state.session.protocolVersion || '-'"
                  mono
                />
              </div>
              <div class="mt-6 grid gap-3 md:grid-cols-2">
                <CapabilityRow
                  label="Tools"
                  :active="Boolean(store.state.session.capabilities?.tools)"
                />
                <CapabilityRow
                  label="Prompts"
                  :active="Boolean(store.state.session.capabilities?.prompts)"
                />
                <CapabilityRow
                  label="Resources"
                  :active="Boolean(store.state.session.capabilities?.resources)"
                />
                <CapabilityRow
                  label="Logging"
                  :active="Boolean(store.state.session.capabilities?.logging)"
                />
              </div>
              <div class="mt-6">
                <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  已保存预设
                </h3>
                <div class="mt-3 space-y-2">
                  <div
                    v-for="preset in store.state.presets"
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
                        @click="loadPreset(preset)"
                      >
                        载入
                      </button>
                      <button
                        class="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white"
                        @click="store.connectPreset(preset.id)"
                      >
                        连接
                      </button>
                      <button
                        class="rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600"
                        @click="handleDeletePreset(preset.id)"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p
                v-if="store.state.error"
                class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {{ store.state.error }}
              </p>
            </div>
          </div>
        </section>

        <section
          v-else-if="store.state.activeStage === 'tools'"
          class="flex min-h-0 flex-1 overflow-hidden"
        >
          <div class="w-72 shrink-0 border-r border-slate-200 bg-white">
            <PanelHeader title="可用工具" :count="store.state.tools.length" />
            <div class="overflow-auto">
              <button
                v-for="tool in store.state.tools"
                :key="tool.name"
                class="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                :class="store.state.selectedToolName === tool.name ? 'bg-cyan-50/50' : ''"
                @click="store.state.selectedToolName = tool.name"
              >
                <div
                  class="text-[13px] font-mono"
                  :class="
                    store.state.selectedToolName === tool.name
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
                v-model="store.state.toolsMode"
                visual-label="可视化视图"
                raw-label="原始 Schema"
              />
              <div class="h-[calc(100%-45px)] overflow-auto p-4">
                <SchemaTree
                  v-if="store.state.toolsMode === 'visual' && store.activeTool?.inputSchema"
                  name="[root]"
                  :schema="store.activeTool.inputSchema"
                />
                <pre
                  v-else
                  class="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm"
                  >{{ JSON.stringify(store.activeTool?.inputSchema ?? {}, null, 2) }}</pre
                >
              </div>
            </div>
            <div class="w-[380px] shrink-0 bg-slate-50/70">
              <PanelHeader title="LLM 实际读取视角" />
              <div class="min-w-0 space-y-4 overflow-auto p-4">
                <p class="text-xs leading-5 text-slate-500">
                  这是客户端基于 descriptor 与 schema 拼出的提示文本预览。
                </p>
                <pre
                  class="w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-900 p-4 text-xs leading-6 text-slate-200 shadow-inner"
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
        </section>

        <section
          v-else-if="store.state.activeStage === 'prompts'"
          class="flex min-h-0 flex-1 overflow-hidden"
        >
          <div class="w-72 shrink-0 border-r border-slate-200 bg-white">
            <PanelHeader title="可用 Prompts" :count="store.state.prompts.length" />
            <div class="overflow-auto">
              <button
                v-for="prompt in store.state.prompts"
                :key="prompt.name"
                class="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                :class="store.state.selectedPromptName === prompt.name ? 'bg-cyan-50/50' : ''"
                @click="selectPrompt(prompt.name)"
              >
                <div
                  class="text-[13px] font-mono"
                  :class="
                    store.state.selectedPromptName === prompt.name
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
              v-model="store.state.promptsMode"
              visual-label="可视化视图"
              raw-label="原始声明"
            />
            <div class="h-[calc(100%-45px)] overflow-auto p-4">
              <div v-if="store.state.promptsMode === 'visual'" class="space-y-4">
                <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Description
                  </div>
                  <p class="mt-2 text-sm text-slate-800">
                    {{ store.activePrompt?.description || 'No description' }}
                  </p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div
                    class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    Arguments
                  </div>
                  <div class="space-y-3">
                    <div
                      v-for="argument in store.activePrompt?.arguments || []"
                      :key="argument.name"
                      class="border-l-2 border-cyan-500 pl-3"
                    >
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-slate-900">
                          {{ argument.name }}
                        </span>
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
                  <div
                    class="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    Prompt 预览
                  </div>
                  <div class="space-y-3">
                    <div
                      v-for="argument in store.activePrompt?.arguments || []"
                      :key="argument.name"
                    >
                      <label
                        class="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        {{ argument.name }}
                      </label>
                      <input
                        v-model="promptArgs[argument.name]"
                        class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <button
                    class="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                    @click="store.renderPrompt(promptArgs)"
                  >
                    渲染 Prompt
                  </button>
                  <pre
                    v-if="store.state.promptResult"
                    class="mt-4 rounded-xl bg-slate-900 p-4 text-xs text-slate-200"
                    >{{ JSON.stringify(store.state.promptResult, null, 2) }}</pre
                  >
                </div>
              </div>
              <pre
                v-else
                class="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm"
                >{{ JSON.stringify(store.activePrompt, null, 2) }}</pre
              >
            </div>
          </div>
        </section>

        <section
          v-else-if="store.state.activeStage === 'resources'"
          class="flex min-h-0 flex-1 overflow-hidden"
        >
          <div class="w-80 shrink-0 border-r border-slate-200 bg-white">
            <PanelHeader title="可用 Resources" :count="store.state.resources.length" />
            <div class="overflow-auto">
              <button
                v-for="resource in store.state.resources"
                :key="resource.uri"
                class="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                :class="store.state.selectedResourceUri === resource.uri ? 'bg-cyan-50/50' : ''"
                @click="selectResource(resource.uri)"
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
              v-model="store.state.resourcesMode"
              visual-label="内容预览"
              raw-label="原始元数据"
            />
            <div class="h-[calc(100%-45px)] overflow-auto p-4">
              <div v-if="store.state.resourcesMode === 'visual'" class="space-y-4">
                <div
                  class="flex items-center gap-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <InfoCard label="MIME Type" :value="store.activeResource?.mimeType || '-'" mono />
                  <InfoCard label="URI" :value="store.activeResource?.uri || '-'" mono />
                </div>
                <button
                  class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  @click="store.loadResource"
                >
                  读取 Resource
                </button>
                <pre
                  v-if="store.state.resourceResult"
                  class="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm"
                  >{{ JSON.stringify(store.state.resourceResult, null, 2) }}</pre
                >
              </div>
              <pre
                v-else
                class="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm"
                >{{ JSON.stringify(store.activeResource, null, 2) }}</pre
              >
            </div>
          </div>
        </section>

        <section v-else class="flex min-h-0 flex-1 overflow-hidden bg-white">
          <div class="w-1/2 min-w-0 border-r border-slate-200 p-4">
            <div class="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              调用参数
            </div>
            <div v-if="store.activeTool?.inputSchema && visualToolFields.length" class="space-y-4">
              <div
                v-for="field in visualToolFields"
                :key="field.name"
                class="border-l-2 pl-3"
                :class="field.required ? 'border-emerald-500' : 'border-cyan-500'"
              >
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-slate-900">{{ field.name }}</span>
                  <span
                    v-if="field.required"
                    class="text-[10px] font-semibold uppercase text-rose-600"
                  >
                    Required
                  </span>
                </div>
                <input
                  v-if="field.kind === 'string' || field.kind === 'number'"
                  v-model="toolArgs[field.name]"
                  class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
                <select
                  v-else-if="field.kind === 'enum'"
                  v-model="toolArgs[field.name]"
                  class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                >
                  <option v-for="option in field.options" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
                <select
                  v-else-if="field.kind === 'boolean'"
                  v-model="toolArgs[field.name]"
                  class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
                <textarea
                  v-else
                  v-model="toolArgs[field.name]"
                  rows="3"
                  class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500"
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
              v-model="rawToolArgs"
              rows="12"
              class="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs outline-none focus:border-cyan-500"
            />
            <button
              class="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              @click="executeTool"
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
              >{{ JSON.stringify(store.state.toolResult, null, 2) }}</pre
            >
          </div>
        </section>
      </main>
    </div>

    <div
      class="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white transition-all duration-300"
      :class="store.state.rawTraceOpen ? 'h-72' : 'h-8'"
    >
      <button
        class="flex h-8 w-full items-center justify-between bg-slate-50 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
        @click="store.state.rawTraceOpen = !store.state.rawTraceOpen"
      >
        <span>原始协议报文 (JSON-RPC)</span>
        <span>{{ store.state.rawTraceOpen ? '收起' : '展开' }}</span>
      </button>
      <div
        v-if="store.state.rawTraceOpen"
        class="grid h-[calc(100%-32px)] grid-cols-2 overflow-hidden font-mono text-xs"
      >
        <div class="overflow-auto border-r border-slate-200 bg-slate-950 p-3 text-emerald-300">
          <div class="mb-2 text-slate-400">// Outgoing</div>
          <pre>{{ JSON.stringify(outgoingTrace, null, 2) }}</pre>
        </div>
        <div class="overflow-auto bg-slate-950 p-3 text-cyan-300">
          <div class="mb-2 text-slate-400">// Incoming</div>
          <pre>{{ JSON.stringify(incomingTrace, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import type { McpServerPreset } from '@preload/types'
import { useMcpStore } from '@renderer/stores/mcp/store'
import type { McpPresetDraft } from '@renderer/stores/mcp/types'
import SchemaTree from './components/SchemaTree.vue'
import PanelHeader from './components/PanelHeader.vue'
import InspectorTabs from './components/InspectorTabs.vue'
import InfoCard from './components/InfoCard.vue'
import CapabilityRow from './components/CapabilityRow.vue'

const store = useMcpStore()
function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const tabs = [
  { id: 'connect', num: '①', label: '连接 & 能力协商' },
  { id: 'tools', num: '②', label: '工具清单 & Schema' },
  { id: 'prompts', num: '③', label: 'Prompts & 上下文' },
  { id: 'resources', num: '④', label: 'Resources & 数据' },
  { id: 'execute', num: '⑤', label: '工具执行 & 响应' }
] as const

const draft = reactive<McpPresetDraft>({ ...store.defaultStdioDraft })
const promptArgs = reactive<Record<string, string>>({})
const toolArgs = reactive<Record<string, string>>({})
const rawToolArgs = computed({
  get: () => JSON.stringify(normalizeToolArgsFromVisual(), null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      Object.keys(toolArgs).forEach((key) => delete toolArgs[key])
      Object.entries(parsed).forEach(([key, val]) => {
        toolArgs[key] = typeof val === 'string' ? val : JSON.stringify(val)
      })
    } catch {
      // Keep editor permissive during typing.
    }
  }
})

const toolPromptPreview = computed(() => {
  const tool = store.activeTool
  if (!tool) return 'No tool selected.'
  const properties =
    (tool.inputSchema?.properties as Record<string, { description?: string }> | undefined) ?? {}
  const required = Array.isArray(tool.inputSchema?.required) ? tool.inputSchema.required : []
  const lines = Object.keys(properties).map((key) => {
    const mode = required.includes(key) ? 'required' : 'optional'
    return `- ${key} (${mode}): ${properties[key]?.description || 'No description'}`
  })
  return [
    `Tool: ${tool.name}`,
    `Description: ${tool.description || 'No description'}`,
    '',
    'Arguments:',
    ...lines
  ].join('\n')
})
const toolHint = computed(() => {
  const description = store.activeTool?.description || ''
  return description.length < 24
    ? '工具描述较短，建议补充使用场景与返回值语义，以提升模型调用命中率。'
    : '当前描述长度可接受，优先检查参数字段说明是否覆盖调用前置条件。'
})
const incomingTrace = computed(() =>
  store.state.traces.filter((item) => item.direction === 'incoming')
)
const outgoingTrace = computed(() =>
  store.state.traces.filter((item) => item.direction === 'outgoing')
)
const visualToolFields = computed(() => {
  const schema = store.activeTool?.inputSchema
  const properties =
    (schema?.properties as Record<string, Record<string, unknown>> | undefined) ?? {}
  const required = Array.isArray(schema?.required) ? schema.required : []
  return Object.entries(properties).map(([name, field]) => ({
    name,
    required: required.includes(name),
    description: typeof field.description === 'string' ? field.description : '',
    kind: Array.isArray(field.enum)
      ? 'enum'
      : field.type === 'boolean'
        ? 'boolean'
        : field.type === 'number' || field.type === 'integer'
          ? 'number'
          : field.type === 'object' || field.type === 'array'
            ? 'json'
            : 'string',
    options: Array.isArray(field.enum) ? field.enum.map(String) : []
  }))
})

onMounted(() => {
  store.initialize()
})

function resetDraft(): void {
  Object.assign(draft, { ...store.defaultStdioDraft, id: '' })
}

function loadPreset(preset: McpServerPreset): void {
  if (preset.transport === 'stdio') {
    Object.assign(draft, {
      id: preset.id,
      name: preset.name,
      transport: 'stdio',
      command: preset.command,
      argsText: preset.args.join(' '),
      cwd: preset.cwd || '',
      envText: JSON.stringify(preset.env || {}, null, 2)
    })
    return
  }

  Object.assign(draft, {
    id: preset.id,
    name: preset.name,
    transport: 'streamable-http',
    url: preset.url,
    headersText: JSON.stringify(preset.headers || {}, null, 2)
  })
}

async function handleSavePreset(): Promise<void> {
  const preset = serializeDraft()
  await store.savePreset(preset)
}

async function connectDraft(): Promise<void> {
  const preset = serializeDraft()
  await store.savePreset(preset)
  await store.connectPreset(preset.id)
}

async function handleDeletePreset(presetId: string): Promise<void> {
  if (!window.confirm('确定删除这个 MCP 预设吗？此操作不可恢复。')) {
    return
  }

  await store.deletePreset(presetId)
  if (draft.id === presetId) {
    resetDraft()
  }
}

function serializeDraft(): McpServerPreset {
  if (draft.transport === 'stdio') {
    return {
      id: draft.id || makeId(),
      name: draft.name,
      transport: 'stdio',
      command: draft.command,
      args: draft.argsText.split(/\s+/).filter(Boolean),
      cwd: draft.cwd || undefined,
      env: draft.envText.trim() ? JSON.parse(draft.envText) : {}
    }
  }

  return {
    id: draft.id || makeId(),
    name: draft.name,
    transport: 'streamable-http',
    url: draft.url,
    headers: draft.headersText.trim() ? JSON.parse(draft.headersText) : {}
  }
}

function selectPrompt(name: string): void {
  store.state.selectedPromptName = name
  Object.keys(promptArgs).forEach((key) => delete promptArgs[key])
}

function selectResource(uri: string): void {
  store.state.selectedResourceUri = uri
}

function normalizeToolArgsFromVisual(): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  visualToolFields.value.forEach((field) => {
    const raw = toolArgs[field.name]
    if (raw === undefined || raw === '') return
    if (field.kind === 'boolean') {
      result[field.name] = raw === 'true'
      return
    }
    if (field.kind === 'number') {
      result[field.name] = Number(raw)
      return
    }
    if (field.kind === 'json') {
      result[field.name] = JSON.parse(raw)
      return
    }
    result[field.name] = raw
  })
  return result
}

async function executeTool(): Promise<void> {
  const payload = rawToolArgs.value.trim() ? JSON.parse(rawToolArgs.value) : {}
  await store.runTool(payload)
}

function tabStatusClass(tabId: string): string {
  if (tabId === 'connect') return store.state.session.connected ? 'bg-emerald-500' : 'bg-slate-300'
  if (!store.state.session.connected) return 'bg-slate-200'
  return 'bg-emerald-500'
}
</script>
