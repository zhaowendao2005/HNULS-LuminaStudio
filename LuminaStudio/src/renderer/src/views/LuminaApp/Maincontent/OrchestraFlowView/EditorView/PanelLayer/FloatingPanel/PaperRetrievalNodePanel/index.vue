<template>
  <div class="of-panel-shell of-paper-retrieval-node-panel" :class="theme.panelClass">
    <div class="of-panel-shell-header">
      <div class="of-panel-shell-title-row">
        <div class="of-panel-shell-icon" :class="theme.iconBgClass">
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M7 4.75h7.25L19 9.5v9.75A1.75 1.75 0 0 1 17.25 21h-10.5A1.75 1.75 0 0 1 5 19.25v-12.5A1.75 1.75 0 0 1 6.75 5h.25"
            />
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 5v5h5" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h8M8 15.5h6" />
          </svg>
        </div>

        <input
          v-model="titleModel"
          class="system-xl-semibold of-panel-shell-title-input"
          placeholder="添加标题..."
        />

        <div class="of-panel-shell-actions">
          <button
            class="of-panel-icon-button flex h-6 w-6 items-center justify-center rounded-md"
            @click="enterDebugMode"
          >
            <svg viewBox="0 0 24 24" class="of-panel-icon-svg h-4 w-4" fill="currentColor">
              <path
                d="M8 18.3915V5.60846L18.2264 12L8 18.3915ZM6 3.80421V20.1957C6 20.9812 6.86395 21.46 7.53 21.0437L20.6432 12.848C21.2699 12.4563 21.2699 11.5436 20.6432 11.152L7.53 2.95621C6.86395 2.53993 6 3.01878 6 3.80421Z"
              />
            </svg>
          </button>
          <button
            class="of-panel-icon-button flex h-6 w-6 items-center justify-center rounded-md"
            @click="handleClose"
          >
            <svg viewBox="0 0 24 24" class="of-panel-icon-svg h-4 w-4" fill="currentColor">
              <path
                d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="of-panel-shell-description">
        <textarea
          v-model="descModel"
          class="of-panel-shell-description-input"
          placeholder="添加描述..."
          :style="{ height: '18px' }"
        />
      </div>

      <div class="of-panel-shell-tabs">
        <button
          class="system-md-semibold of-panel-tab-button"
          :class="
            activeTab === 'settings'
              ? [theme.tabActiveClass, 'of-panel-tab-button-active']
              : 'of-panel-tab-button-inactive'
          "
          @click="setActiveTab('settings')"
        >
          设置
        </button>
        <button
          class="system-md-semibold of-panel-tab-button"
          :class="
            activeTab === 'lastRun'
              ? [theme.tabActiveClass, 'of-panel-tab-button-active']
              : 'of-panel-tab-button-inactive'
          "
          @click="setActiveTab('lastRun')"
        >
          上次运行
        </button>
      </div>
    </div>

    <div class="of-panel-shell-body">
      <div v-if="activeTab === 'settings' && !debugMode" class="of-panel-shell-body-inner">
        <section class="of-panel-section of-panel-container-section">
          <div class="of-doc-title-strong">基础信息</div>
          <div class="mt-2 space-y-2 text-xs leading-5 text-gray-500">
            <div>该节点会把查询模板渲染成最终检索词，再按所选 provider 发起论文检索。</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                class="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
              >
                {{ selectedProviderLabel || '未选择 Provider' }}
              </span>
              <span
                class="rounded-md border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700"
              >
                TOP {{ topKModel }}
              </span>
              <span
                class="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700"
              >
                {{ sortSummary }}
              </span>
            </div>
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="flex items-center justify-between gap-3">
            <div class="of-doc-title-strong">查询模板</div>
            <button class="of-state-inline-action" @click="addPrompt">添加消息</button>
          </div>

          <div v-if="promptItems.length === 0" class="of-state-empty mt-2">
            暂无查询模板，至少添加一条消息来描述检索意图。
          </div>

          <div
            v-for="item in promptItems"
            :key="item.id"
            class="mt-2 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <button
                  v-for="option in promptRoleOptions"
                  :key="option.value"
                  type="button"
                  class="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase transition"
                  :class="item.role === option.value ? option.activeClass : 'text-gray-400'"
                  @click="updatePromptRole(item.id, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="of-state-inline-action"
                  @click="openPromptVariableSelector(item.id, $event)"
                >
                  插入变量
                </button>
                <button
                  class="of-declare-action of-declare-action-danger"
                  @click="removePrompt(item.id)"
                >
                  删除
                </button>
              </div>
            </div>

            <PromptTextarea
              :ref="(el) => setPromptEditorRef(item.id, el)"
              :model-value="item.text"
              :height="88"
              placeholder="输入检索模板，例如疾病、作者、时间范围等条件..."
              @update:model-value="updatePrompt(item.id, { text: $event })"
            />
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="of-doc-title-strong">Provider 选择</div>

          <div
            v-if="providerLoadError"
            class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
          >
            {{ providerLoadError }}
          </div>

          <div class="mt-2 grid grid-cols-1 gap-2">
            <button
              v-for="provider in providerOptions"
              :key="provider.id"
              class="rounded-xl border px-3 py-2 text-left transition"
              :class="
                providerIdModel === provider.id
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-[#e5e7eb] bg-[#f3f4f6] text-gray-700 hover:border-emerald-200 hover:bg-white'
              "
              @click="selectProvider(provider.id)"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-[13px] font-semibold leading-[18px]">
                    {{ provider.label }}
                  </div>
                  <div class="mt-1 text-xs leading-5 text-gray-500">{{ provider.description }}</div>
                </div>
                <div class="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">
                  {{ provider.id }}
                </div>
              </div>
            </button>
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="flex items-center justify-between gap-3">
            <div class="of-doc-title-strong">API Key 引用区</div>
            <button class="of-state-inline-action" @click="openSettingsEntry">打开设置</button>
          </div>

          <div class="mt-2 text-xs leading-5 text-gray-500">
            面板只保存 API Key 引用 id，不在这里展示或输入明文 key。
          </div>

          <div class="mt-3 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-[13px] font-semibold leading-[18px] text-gray-800">当前状态</div>
                <div class="mt-1 text-xs text-gray-500">
                  {{ apiKeyStateSummary }}
                </div>
              </div>
              <span
                class="rounded-md px-2 py-0.5 text-[10px] font-medium"
                :class="
                  selectedProvider?.requires_api_key
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700'
                "
              >
                {{ selectedProvider?.requires_api_key ? 'REQUIRED' : 'OPTIONAL' }}
              </span>
            </div>

            <select v-model="apiKeyRefIdModel" class="of-panel-input mt-3 h-10">
              <option value="">
                {{ selectedProvider?.requires_api_key ? '请选择 API Key 引用' : '不使用 API Key' }}
              </option>
              <option v-for="entry in selectableApiKeyEntries" :key="entry.id" :value="entry.id">
                {{ entry.label }}
              </option>
            </select>
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="flex items-center justify-between gap-3">
            <div class="of-doc-title-strong">Provider 参数区</div>
            <div class="text-xs text-gray-500">动态随 descriptor 变化</div>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <div class="of-panel-field-stack">
              <div class="system-sm-semibold-uppercase text-gray-700">返回条数</div>
              <input
                v-model.number="topKModel"
                type="number"
                min="1"
                max="20"
                class="of-panel-input h-10"
              />
            </div>
            <div class="of-panel-field-stack">
              <div class="system-sm-semibold-uppercase text-gray-700">排序方式</div>
              <select v-model="sortByModel" class="of-panel-input h-10">
                <option value="relevance">相关度</option>
                <option value="date_desc">最新优先</option>
                <option value="date_asc">最早优先</option>
              </select>
            </div>
          </div>

          <div v-if="selectedProvider?.supports_date_range" class="mt-3 grid grid-cols-2 gap-2">
            <div class="of-panel-field-stack">
              <div class="system-sm-semibold-uppercase text-gray-700">起始日期</div>
              <input v-model="dateFromModel" type="date" class="of-panel-input h-10" />
            </div>
            <div class="of-panel-field-stack">
              <div class="system-sm-semibold-uppercase text-gray-700">结束日期</div>
              <input v-model="dateToModel" type="date" class="of-panel-input h-10" />
            </div>
          </div>

          <div
            v-if="descriptorFields.length === 0"
            class="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-400"
          >
            当前 provider 没有额外字段。
          </div>

          <div v-else class="mt-3 space-y-3">
            <div v-for="field in descriptorFields" :key="field.key" class="of-panel-field-stack">
              <div class="flex items-center gap-1.5">
                <div class="system-sm-semibold-uppercase text-gray-700">{{ field.label }}</div>
                <span v-if="field.required" class="text-xs font-semibold text-rose-500">*</span>
              </div>

              <textarea
                v-if="field.type === 'string' && isLongTextField(field.key)"
                :value="getProviderFieldDisplayValue(field.key)"
                rows="3"
                class="of-panel-input min-h-[88px] py-2"
                :placeholder="field.description || '请输入'"
                @input="
                  updateProviderOption(field.key, ($event.target as HTMLTextAreaElement).value)
                "
              />

              <button
                v-else-if="field.type === 'boolean'"
                type="button"
                class="inline-flex h-8 max-w-full items-center overflow-hidden rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm"
              >
                <span
                  class="min-w-[54px] rounded-[5px] px-2 text-center text-xs font-semibold leading-7 transition"
                  :class="
                    providerOptionsModel[field.key] === true
                      ? 'bg-green-50 text-green-700 shadow-sm'
                      : 'text-gray-400'
                  "
                  @click="updateProviderOption(field.key, true)"
                >
                  TRUE
                </span>
                <span
                  class="min-w-[54px] rounded-[5px] px-2 text-center text-xs font-semibold leading-7 transition"
                  :class="
                    providerOptionsModel[field.key] === false
                      ? 'bg-rose-50 text-rose-700 shadow-sm'
                      : 'text-gray-400'
                  "
                  @click="updateProviderOption(field.key, false)"
                >
                  FALSE
                </span>
              </button>

              <input
                v-else
                :value="getProviderFieldDisplayValue(field.key)"
                :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
                class="of-panel-input h-10"
                :placeholder="field.description || '请输入'"
                @input="updateProviderOption(field.key, ($event.target as HTMLInputElement).value)"
              />

              <div class="text-xs leading-5 text-gray-500">{{ field.description }}</div>
            </div>
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="of-doc-title-strong">输出说明</div>

          <div class="mt-3 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
            <div class="text-xs leading-5 text-gray-500">
              该节点会输出 query、provider、total_found、returned_count、items、latency_ms 与完整
              result。
            </div>

            <div class="mt-3 space-y-2">
              <div
                v-for="item in outputPreviewItems"
                :key="item.name"
                class="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2"
              >
                <div class="text-[13px] font-semibold leading-[18px] text-gray-800">
                  {{ item.name }}
                </div>
                <div class="text-xs text-gray-500">{{ item.type }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="of-doc-title-strong">调试</div>
          <div class="mt-2 text-xs leading-5 text-gray-500">
            调试时只需要补充查询模板里引用到的变量。点击右上角运行按钮即可进入调试输入表单。
          </div>
        </section>
      </div>

      <div v-else-if="activeTab === 'settings' && debugMode" class="of-panel-shell-body-inner">
        <NodeDebugForm
          :fields="debugFields"
          :model-value="debugFormValues"
          :running="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
          @update:model-value="handleDebugFormUpdate"
          @execute="executeNodeDebug"
        />
      </div>

      <div v-else-if="activeTab === 'lastRun'" class="of-panel-shell-body-inner">
        <PaperRetrievalDebugResult
          :result="nodeDebugResult"
          :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  ApiKeyEntry,
  PaperRetrievalAPI,
  PaperRetrievalProviderDescriptor,
  PaperRetrievalProviderFieldDescriptor
} from '@preload/types'
import type { OFPaperRetrievalNodeData, OFPromptItem } from '@shared/Orchestraflow-types'
import type { NodeDebugField } from '../NodeDebug/NodeDebugForm.vue'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import { useUserConfigStore } from '@renderer/stores/user-config/store'
import { usePaperRetrievalNodeConfigStore } from '@renderer/stores/orchestraflow/workflow-editor/node-config/paper-retrieval-node-config/paper-retrieval-node-config.store'
import { OF_PANEL_THEME } from '../panel-theme'
import PromptTextarea from '../PromptTextarea/index.vue'
import NodeDebugForm from '../NodeDebug/NodeDebugForm.vue'
import PaperRetrievalDebugResult from './components/PaperRetrievalDebugResult.vue'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()
const userConfigStore = useUserConfigStore()
const configStore = usePaperRetrievalNodeConfigStore()

const theme = OF_PANEL_THEME.paperRetrieval
const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)
const promptEditorRefs = new Map<string, { getCursorPosition: () => number }>()
const activePromptTarget = ref<{ promptId: string; cursorPosition: number } | null>(null)
const providerOptions = ref<PaperRetrievalProviderDescriptor[]>([])
const providerLoadError = ref('')

const promptRoleOptions = [
  { label: 'SYSTEM', value: 'system', activeClass: 'bg-emerald-50 text-emerald-700' },
  { label: 'USER', value: 'user', activeClass: 'bg-cyan-50 text-cyan-700' },
  { label: 'ASSISTANT', value: 'assistant', activeClass: 'bg-violet-50 text-violet-700' }
] as const

/**
 * 这里保留一次可选读取兜底。
 * 正常情况下 paperRetrieval 已经通过 preload bridge 暴露到 window.api，
 * 但在异常加载场景里仍然避免面板直接崩掉。
 */
function getPaperRetrievalAPI(): PaperRetrievalAPI | null {
  const api = window.api as typeof window.api & { paperRetrieval?: PaperRetrievalAPI }
  return api.paperRetrieval || null
}

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId) || null
})

const nodeData = computed(() => currentNode.value?.data as OFPaperRetrievalNodeData | undefined)
const promptItems = computed(() => nodeData.value?.query_template || [])

const titleModel = computed({
  get: () => nodeData.value?.title || '论文检索',
  set: (value: string) => {
    patchNode({ title: value })
  }
})

const descModel = computed({
  get: () => nodeData.value?.desc || '',
  set: (value: string) => {
    patchNode({ desc: value })
  }
})

const providerIdModel = computed({
  get: () => nodeData.value?.provider_id || '',
  set: (value: string) => {
    const descriptor = providerOptions.value.find((item) => item.id === value)
    patchNode({
      provider_id: value,
      api_key_ref_id: null,
      provider_options: buildProviderOptionsFromDescriptor(
        descriptor,
        nodeData.value?.provider_options || {}
      )
    })
  }
})

const apiKeyRefIdModel = computed({
  get: () => nodeData.value?.api_key_ref_id || '',
  set: (value: string) => {
    patchNode({ api_key_ref_id: value || null })
  }
})

const topKModel = computed({
  get: () => Math.max(1, Math.min(20, Number(nodeData.value?.top_k || 5))),
  set: (value: number) => {
    const normalized = Math.max(1, Math.min(20, Number(value || 5)))
    patchNode({ top_k: normalized })
  }
})

const sortByModel = computed({
  get: () => nodeData.value?.sort_by || 'relevance',
  set: (value: OFPaperRetrievalNodeData['sort_by']) => {
    patchNode({ sort_by: value })
  }
})

const dateFromModel = computed({
  get: () => formatDateInputValue(nodeData.value?.date_from || null),
  set: (value: string) => {
    patchNode({ date_from: value || null })
  }
})

const dateToModel = computed({
  get: () => formatDateInputValue(nodeData.value?.date_to || null),
  set: (value: string) => {
    patchNode({ date_to: value || null })
  }
})

const providerOptionsModel = computed(() => nodeData.value?.provider_options || {})
const selectedProvider = computed(() => {
  return providerOptions.value.find((item) => item.id === providerIdModel.value) || null
})
const selectedProviderLabel = computed(() => selectedProvider.value?.label || '')
const descriptorFields = computed(() => {
  return (selectedProvider.value?.fields || []).filter(
    (field) => !['limit', 'sort', 'start_date', 'end_date'].includes(field.key)
  )
})

const selectableApiKeyEntries = computed<ApiKeyEntry[]>(() => {
  return userConfigStore
    .getEntriesByProvider(providerIdModel.value)
    .filter((entry) => entry.enabled && entry.api_key.trim())
})

const apiKeyStateSummary = computed(() => {
  if (!selectedProvider.value) return '请先选择 Provider。'
  if (!selectedProvider.value.requires_api_key) {
    return apiKeyRefIdModel.value
      ? `已选择引用：${resolveApiKeyLabel(apiKeyRefIdModel.value)}`
      : '当前 provider 支持匿名访问，可按需绑定引用。'
  }
  if (!selectableApiKeyEntries.value.length) {
    return '当前 provider 需要 API Key，但设置中还没有可用引用。'
  }
  return apiKeyRefIdModel.value
    ? `已选择引用：${resolveApiKeyLabel(apiKeyRefIdModel.value)}`
    : '当前 provider 需要 API Key，请选择一个引用。'
})

const sortSummary = computed(() => {
  if (sortByModel.value === 'date_desc') return '最新优先'
  if (sortByModel.value === 'date_asc') return '最早优先'
  return '相关度'
})

const outputPreviewItems = computed(() => {
  const variables = nodeData.value?.output?.variables || []
  return variables.map((item) => ({
    name: item.variable,
    type: String(item.type || 'string')
  }))
})

const debugFields = computed<NodeDebugField[]>(() => {
  const matched = new Set<string>()
  const fields: NodeDebugField[] = []

  for (const item of promptItems.value) {
    const regex = /\{\{\s*([\w.]+)\s*\}\}/g
    for (const match of item.text.matchAll(regex)) {
      const key = match[1]
      if (!key || matched.has(key)) continue
      matched.add(key)
      fields.push({
        key,
        label: key,
        required: false,
        placeholder: `请输入 ${key}`
      })
    }
  }

  return fields
})

const debugFormValues = computed(() => {
  const nodeId = uiStore.selectedNodeId
  return nodeId ? nodeDebugStore.getNodeFormValues(nodeId) : {}
})

const nodeDebugResult = computed(() => {
  const nodeId = uiStore.selectedNodeId
  return nodeId ? nodeDebugStore.getLastRun(nodeId) : undefined
})

watch(
  currentNode,
  (node) => {
    if (!node) {
      configStore.clear()
      return
    }
    configStore.loadConfig(node.id, {
      nodeId: node.id,
      ...(node.data as OFPaperRetrievalNodeData)
    })
  },
  { immediate: true }
)

function setActiveTab(tab: 'settings' | 'lastRun') {
  activeTab.value = tab
  if (tab !== 'settings') {
    debugMode.value = false
  }
}

function enterDebugMode() {
  debugMode.value = true
  activeTab.value = 'settings'
}

function handleClose() {
  uiStore.closeNodeConfigPanel()
}

function patchNode(patch: Partial<OFPaperRetrievalNodeData>) {
  if (!currentNode.value) return
  configStore.patchConfig(patch as any)
  editorStore.updateNode(currentNode.value.id, patch)
}

function setPromptEditorRef(id: string, instance: unknown) {
  if (instance && typeof instance === 'object') {
    promptEditorRefs.set(id, instance as { getCursorPosition: () => number })
  } else {
    promptEditorRefs.delete(id)
  }
}

function updatePrompt(promptId: string, patch: Partial<Omit<OFPromptItem, 'id'>>) {
  const next = promptItems.value.map((item) =>
    item.id === promptId ? { ...item, ...patch } : item
  )
  patchNode({ query_template: next })
}

function updatePromptRole(promptId: string, value: OFPromptItem['role']) {
  updatePrompt(promptId, { role: value })
}

function addPrompt() {
  const nextItem: OFPromptItem = {
    id: `paper_prompt_${Date.now()}`,
    role: promptItems.value.length === 0 ? 'user' : 'system',
    text: ''
  }
  patchNode({ query_template: [...promptItems.value, nextItem] })
}

function removePrompt(promptId: string) {
  patchNode({ query_template: promptItems.value.filter((item) => item.id !== promptId) })
}

function openPromptVariableSelector(promptId: string, event: MouseEvent) {
  if (!currentNode.value) return
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  const anchorPoint = { x: event.clientX, y: event.clientY }
  const editorRef = promptEditorRefs.get(promptId)
  activePromptTarget.value = {
    promptId,
    cursorPosition: editorRef?.getCursorPosition?.() || 0
  }
  variableSelectorStore.openSelector(
    currentNode.value.id,
    'prompt',
    activePromptTarget.value.cursorPosition,
    anchorRect,
    anchorPoint
  )
}

function insertVariableIntoPrompt(promptId: string, variablePath: string, cursorPosition: number) {
  const item = promptItems.value.find((entry) => entry.id === promptId)
  if (!item) return
  const insertion = `{{${variablePath}}}`
  const start = Math.max(0, Math.min(cursorPosition, item.text.length))
  updatePrompt(promptId, {
    text: `${item.text.slice(0, start)}${insertion}${item.text.slice(start)}`
  })
}

function handleVariableSelect(event: Event) {
  const detail = (event as CustomEvent).detail
  if (
    detail?.nodeId !== uiStore.selectedNodeId ||
    detail?.targetType !== 'prompt' ||
    !activePromptTarget.value
  ) {
    return
  }
  insertVariableIntoPrompt(
    activePromptTarget.value.promptId,
    detail.variable.path,
    activePromptTarget.value.cursorPosition
  )
  activePromptTarget.value = null
}

function selectProvider(providerId: string) {
  providerIdModel.value = providerId
}

function buildProviderOptionsFromDescriptor(
  descriptor: PaperRetrievalProviderDescriptor | null | undefined,
  currentOptions: Record<string, string | number | boolean | null>
): Record<string, string | number | boolean | null> {
  if (!descriptor) return currentOptions

  const nextOptions: Record<string, string | number | boolean | null> = {}
  descriptor.fields.forEach((field) => {
    if (field.key === 'limit') {
      if (!currentOptions.limit && field.default_value !== undefined) {
        nextOptions.limit = normalizeFieldValue(field, field.default_value)
      }
      return
    }
    if (field.key === 'sort') {
      return
    }
    if (field.key === 'start_date' || field.key === 'end_date') {
      return
    }

    const currentValue = currentOptions[field.key]
    if (currentValue !== undefined) {
      nextOptions[field.key] = currentValue
      return
    }
    nextOptions[field.key] = normalizeFieldValue(field, field.default_value ?? null)
  })
  return nextOptions
}

function normalizeFieldValue(
  field: PaperRetrievalProviderFieldDescriptor,
  rawValue: unknown
): string | number | boolean | null {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null
  }
  if (field.type === 'number') {
    const parsed = Number(rawValue)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (field.type === 'boolean') {
    return Boolean(rawValue)
  }
  return String(rawValue)
}

function updateProviderOption(key: string, rawValue: string | boolean) {
  const field = descriptorFields.value.find((item) => item.key === key)
  if (!field) return
  const nextOptions = {
    ...providerOptionsModel.value,
    [key]: normalizeFieldValue(field, rawValue)
  }
  patchNode({ provider_options: nextOptions })
}

function getProviderFieldDisplayValue(key: string): string {
  const value = providerOptionsModel.value[key]
  if (value === undefined || value === null) return ''
  return String(value)
}

function isLongTextField(key: string): boolean {
  return ['query', 'keywords', 'advanced_query'].includes(key)
}

function resolveApiKeyLabel(refId: string): string {
  return userConfigStore.apiKeyEntries.find((entry) => entry.id === refId)?.label || refId
}

function formatDateInputValue(value: string | null): string {
  if (!value) return ''
  return value.replace(/\//g, '-')
}

function openSettingsEntry() {
  window.dispatchEvent(
    new CustomEvent('of:open-settings', {
      detail: {
        tab: 'settings',
        section: 'api-keys',
        providerId: providerIdModel.value || null
      }
    })
  )
}

function handleDebugFormUpdate(values: Record<string, any>) {
  if (!uiStore.selectedNodeId) return
  Object.entries(values).forEach(([key, value]) => {
    nodeDebugStore.setNodeFormValue(uiStore.selectedNodeId!, key, value)
  })
}

async function executeNodeDebug(values: Record<string, any>) {
  if (!editorStore.currentWorkflowId || !uiStore.selectedNodeId) return
  debugMode.value = false
  activeTab.value = 'lastRun'
  await nodeDebugStore.runNodeDebug({
    workflowId: editorStore.currentWorkflowId,
    nodeId: uiStore.selectedNodeId,
    inputs: { ...values },
    scopePath: editorStore.getNodeAncestorPath(uiStore.selectedNodeId)
  })
}

async function loadProviders() {
  providerLoadError.value = ''
  const api = getPaperRetrievalAPI()
  if (!api) {
    providerLoadError.value = 'paperRetrieval API 当前不可用，请检查 preload bridge 是否正常加载。'
    providerOptions.value = []
    return
  }

  const response = await api.listProviders()
  if (!response.success || !response.data) {
    providerLoadError.value = response.error || '加载 provider 列表失败。'
    providerOptions.value = []
    return
  }

  providerOptions.value = response.data
}

onMounted(async () => {
  await Promise.all([loadProviders(), userConfigStore.fetchApiKeys()])
  window.addEventListener('of:variable-select', handleVariableSelect as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('of:variable-select', handleVariableSelect as EventListener)
})
</script>

<style scoped src="../../../../styles/node-panel.scss"></style>
