<template>
  <div class="of-llm-node-panel h-full flex flex-col">
    <div class="border-b border-gray-100 px-4 pb-2 pt-4">
      <div class="flex items-center gap-3">
        <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#635bff] text-white">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path
              d="M12 2a7 7 0 0 0-7 7v2.5a2.5 2.5 0 0 0-1 2v1a2.5 2.5 0 0 0 2.5 2.5H8v2a3 3 0 0 0 3 3h2v-2h-2a1 1 0 0 1-1-1v-2.086A2.497 2.497 0 0 0 11.5 14.5v-1A2.5 2.5 0 0 0 10 11.086V9a5 5 0 1 1 10 0v2.086A2.5 2.5 0 0 0 18.5 13.5v1a2.5 2.5 0 0 0 2.5 2.5H22v-8a10 10 0 0 0-10-10Z"
            />
          </svg>
        </div>

        <input
          v-model="titleModel"
          class="system-xl-semibold h-7 min-w-0 flex-1 appearance-none rounded-md border border-transparent bg-transparent px-1 text-gray-900 outline-none focus:shadow-xs"
          placeholder="添加标题..."
        />

        <div class="flex shrink-0 items-center gap-1">
          <button
            class="flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100"
            @click="enterDebugMode"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-400" fill="currentColor">
              <path
                d="M8 18.3915V5.60846L18.2264 12L8 18.3915ZM6 3.80421V20.1957C6 20.9812 6.86395 21.46 7.53 21.0437L20.6432 12.848C21.2699 12.4563 21.2699 11.5436 20.6432 11.152L7.53 2.95621C6.86395 2.53993 6 3.01878 6 3.80421Z"
              />
            </svg>
          </button>
          <a
            href="https://docs.dify.ai/zh/use-dify/nodes/llm"
            target="_blank"
            class="flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-400" fill="currentColor">
              <path
                d="M13 21V23H11V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H9C10.1947 3 11.2671 3.52375 12 4.35418C12.7329 3.52375 13.8053 3 15 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H13ZM20 19V5H15C13.8954 5 13 5.89543 13 7V19H20ZM11 19V7C11 5.89543 10.1046 5 9 5H4V19H11Z"
              />
            </svg>
          </a>
          <button class="flex h-6 w-6 items-center justify-center" @click="handleClose">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-400" fill="currentColor">
              <path
                d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="mt-2">
        <textarea
          v-model="descModel"
          class="w-full resize-none appearance-none bg-transparent text-xs leading-[18px] text-gray-600 outline-none placeholder:text-gray-400"
          placeholder="添加描述..."
          :style="{ height: '18px' }"
        />
      </div>

      <div class="mt-3 flex items-center gap-4">
        <button
          class="system-md-semibold border-b-2 pb-2 pt-2.5"
          :class="
            activeTab === 'settings'
              ? 'border-[#635bff] text-gray-900'
              : 'border-transparent text-gray-400'
          "
          @click="setActiveTab('settings')"
        >
          设置
        </button>
        <button
          class="system-md-semibold border-b-2 pb-2 pt-2.5"
          :class="
            activeTab === 'lastRun'
              ? 'border-[#635bff] text-gray-900'
              : 'border-transparent text-gray-400'
          "
          @click="setActiveTab('lastRun')"
        >
          上次运行
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="activeTab === 'settings' && !debugMode" class="space-y-5 px-4 py-4">
        <section class="space-y-3 rounded-2xl border border-gray-200 bg-[#fafbff] p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="system-sm-semibold-uppercase text-gray-500">模型</div>
              <div class="mt-1 text-xs text-gray-400">选择 Provider 和模型名称</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1.5">
              <div class="text-xs font-medium text-gray-500">Provider</div>
              <select
                v-model="providerIdModel"
                class="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#8ea0ff]"
              >
                <option value="">请选择 Provider</option>
                <option v-for="provider in providers" :key="provider.id" :value="provider.id">
                  {{ provider.name }}
                </option>
              </select>
            </label>

            <label class="space-y-1.5">
              <div class="text-xs font-medium text-gray-500">Model</div>
              <select
                v-model="modelNameModel"
                class="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#8ea0ff]"
              >
                <option value="">请选择模型</option>
                <option v-for="model in availableModels" :key="model.id" :value="model.id">
                  {{ model.name || model.id }}
                </option>
              </select>
            </label>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="system-sm-semibold-uppercase text-gray-500">提示词</div>
              <div class="mt-1 text-xs text-gray-400">
                支持插入变量，格式为 <code v-pre>{{variable.path}}</code>
              </div>
            </div>
            <button
              class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              @click="addPrompt"
            >
              添加消息
            </button>
          </div>

          <div v-if="promptItems.length === 0" class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
            暂无 Prompt，点击“添加消息”开始配置
          </div>

          <div
            v-for="item in promptItems"
            :key="item.id"
            class="rounded-2xl border border-gray-200 bg-white p-3 shadow-xs"
          >
            <div class="flex items-center gap-2">
              <select
                :value="item.role"
                class="h-8 rounded-lg border border-gray-200 bg-[#f8fafc] px-3 text-xs font-medium uppercase tracking-wide text-gray-600 outline-none focus:border-[#8ea0ff]"
                @change="updatePrompt(item.id, { role: ($event.target as HTMLSelectElement).value as OFPromptItem['role'] })"
              >
                <option value="system">system</option>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>

              <div class="ml-auto flex items-center gap-1">
                <button
                  class="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-500 hover:bg-gray-50"
                  @click="openPromptVariableSelector(item.id, $event)"
                >
                  <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
                    <path d="M14.6 16.6L19.2 12L14.6 7.4L16 6L22 12L16 18L14.6 16.6ZM9.4 16.6L4.8 12L9.4 7.4L8 6L2 12L8 18L9.4 16.6Z" />
                  </svg>
                  插入变量
                </button>
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                  @click="removePrompt(item.id)"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                    <path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="mt-3 rounded-2xl border border-gray-200 bg-[#fbfcff] px-3 py-2">
              <PromptTextarea
                :ref="(el) => setPromptEditorRef(item.id, el)"
                :model-value="item.text"
                :height="96"
                placeholder="输入消息内容..."
                @update:model-value="updatePrompt(item.id, { text: $event })"
              />
            </div>
          </div>
        </section>

        <section class="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="system-sm-semibold-uppercase text-gray-500">结构化输出</div>
              <div class="mt-1 text-xs text-gray-400">
                开启后附加 `structured_output` object 输出变量
              </div>
            </div>

            <button
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="structuredEnabled ? 'bg-[#635bff]' : 'bg-[#cbd5e1]'"
              @click="toggleStructuredOutput"
            >
              <span
                class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                :class="structuredEnabled ? 'translate-x-5' : 'translate-x-1'"
              />
            </button>
          </div>

          <div
            v-if="structuredEnabled"
            class="rounded-2xl border border-[#d9e0ff] bg-[#f7f8ff] p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-medium text-gray-800">
                  {{
                    structuredSchema
                      ? `已配置 ${Object.keys(structuredSchema.properties || {}).length} 个字段`
                      : '尚未配置对象字段'
                  }}
                </div>
                <div class="mt-1 text-xs text-gray-500">
                  {{ structuredSchema ? schemaSummary : '点击右侧按钮开始配置 JSON Schema' }}
                </div>
              </div>
              <button
                class="shrink-0 rounded-lg border border-[#cfd7ff] bg-white px-3 py-1.5 text-sm text-[#4f46e5] hover:bg-[#eef2ff]"
                @click="openSchemaEditor"
              >
                配置对象
              </button>
            </div>
          </div>
        </section>

        <section class="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <div>
            <div class="system-sm-semibold-uppercase text-gray-500">输出变量</div>
            <div class="mt-1 text-xs text-gray-400">系统自动生成，无需手动编辑</div>
          </div>

          <div class="space-y-2">
            <div
              v-for="item in autoOutputs"
              :key="item.variable"
              class="flex items-center justify-between rounded-xl border border-gray-200 bg-[#fafafa] px-3 py-2"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-[#635bff]">{x}</span>
                <div>
                  <div class="text-sm font-medium text-gray-700">{{ item.variable }}</div>
                  <div class="text-xs text-gray-400">{{ (item.value_selector || []).join('.') }}</div>
                </div>
              </div>
              <div class="rounded bg-gray-100 px-2 py-1 text-xs uppercase text-gray-500">
                {{ item.type || 'string' }}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div v-else-if="activeTab === 'settings' && debugMode" class="px-4 py-4">
        <NodeDebugForm
          :fields="debugFields"
          :model-value="debugFormValues"
          :running="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
          @update:model-value="handleDebugFormUpdate"
          @execute="executeNodeDebug"
        />
      </div>

      <div v-else-if="activeTab === 'lastRun'" class="px-4 py-4">
        <NodeDebugLastRun
          :result="nodeDebugResult"
          :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
        />
      </div>
    </div>

    <ObjectSchemaEditor @save="handleSchemaSave" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type {
  OFJsonSchemaObject,
  OFLLMNodeData,
  OFPromptItem,
  OFStructuredOutputConfig
} from '@shared/Orchestraflow-types'
import { buildLLMOutputVariables } from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import { useObjectSchemaEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/object-schema-editor/object-schema-editor.store'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import type { NodeDebugField } from './NodeDebug/NodeDebugForm.vue'
import PromptTextarea from './PromptTextarea/index.vue'
import NodeDebugForm from './NodeDebug/NodeDebugForm.vue'
import NodeDebugLastRun from './NodeDebug/NodeDebugLastRun.vue'
import ObjectSchemaEditor from './ObjectSchemaEditor/index.vue'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()
const objectSchemaEditorStore = useObjectSchemaEditorStore()
const modelConfigStore = useModelConfigStore()

const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)
const promptEditorRefs = new Map<string, { getCursorPosition: () => number }>()
const activePromptTarget = ref<{ promptId: string; cursorPosition: number } | null>(null)

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.nodes.find((node) => node.id === uiStore.selectedNodeId) || null
})

const nodeData = computed(() => currentNode.value?.data as OFLLMNodeData | undefined)
const providers = computed(() => modelConfigStore.providers)

const titleModel = computed({
  get: () => nodeData.value?.title || 'LLM',
  set: (value: string) => {
    if (!currentNode.value) return
    editorStore.updateNode(currentNode.value.id, { title: value } as Partial<OFLLMNodeData>)
  }
})

const descModel = computed({
  get: () => nodeData.value?.desc || '',
  set: (value: string) => {
    if (!currentNode.value) return
    editorStore.updateNode(currentNode.value.id, { desc: value } as Partial<OFLLMNodeData>)
  }
})

const providerIdModel = computed({
  get: () => nodeData.value?.model?.provider || '',
  set: (value: string) => {
    if (!nodeData.value || !currentNode.value) return
    const nextProvider = providers.value.find((item) => item.id === value)
    const exists = (nextProvider?.models || []).some((item) => item.id === nodeData.value?.model?.name)
    editorStore.updateNode(currentNode.value.id, {
      model: {
        ...nodeData.value.model,
        provider: value,
        name: exists ? nodeData.value.model.name : ''
      }
    } as Partial<OFLLMNodeData>)
  }
})

const availableModels = computed(() => {
  const provider = providers.value.find((item) => item.id === providerIdModel.value)
  return provider?.models || []
})

const modelNameModel = computed({
  get: () => nodeData.value?.model?.name || '',
  set: (value: string) => {
    if (!nodeData.value || !currentNode.value) return
    editorStore.updateNode(currentNode.value.id, {
      model: {
        ...nodeData.value.model,
        name: value
      }
    } as Partial<OFLLMNodeData>)
  }
})

const promptItems = computed(() => nodeData.value?.prompt_template || [])
const structuredSchema = computed(() => nodeData.value?.structured_output?.schema || null)
const structuredEnabled = computed(() => Boolean(nodeData.value?.structured_output?.enabled))
const autoOutputs = computed(() => {
  if (!currentNode.value || !nodeData.value) return []
  return buildLLMOutputVariables(currentNode.value.id, nodeData.value.structured_output)
})

const schemaSummary = computed(() => {
  const schema = structuredSchema.value
  if (!schema) return ''
  const fields = Object.entries(schema.properties || {}).map(([name, item]) => `${name}:${item.type}`)
  return fields.join(' / ')
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

function setActiveTab(tab: 'settings' | 'lastRun') {
  activeTab.value = tab
  if (tab !== 'settings') {
    debugMode.value = false
  }
}

function handleClose() {
  uiStore.closeNodeConfigPanel()
}

function enterDebugMode() {
  debugMode.value = true
  activeTab.value = 'settings'
}

function setPromptEditorRef(id: string, instance: unknown) {
  if (instance && typeof instance === 'object') {
    promptEditorRefs.set(id, instance as { getCursorPosition: () => number })
  } else {
    promptEditorRefs.delete(id)
  }
}

function patchNode(patch: Partial<OFLLMNodeData>) {
  if (!currentNode.value) return
  editorStore.updateNode(currentNode.value.id, patch)
}

function updatePrompt(promptId: string, patch: Partial<Omit<OFPromptItem, 'id'>>) {
  const next = promptItems.value.map((item) => (item.id === promptId ? { ...item, ...patch } : item))
  patchNode({ prompt_template: next } as Partial<OFLLMNodeData>)
}

function addPrompt() {
  const nextItem: OFPromptItem = {
    id: `prompt_${Date.now()}`,
    role: promptItems.value.length === 0 ? 'user' : 'system',
    text: ''
  }
  patchNode({ prompt_template: [...promptItems.value, nextItem] } as Partial<OFLLMNodeData>)
}

function removePrompt(promptId: string) {
  const next = promptItems.value.filter((item) => item.id !== promptId)
  patchNode({ prompt_template: next } as Partial<OFLLMNodeData>)
}

function syncStructuredOutput(nextStructuredOutput: OFStructuredOutputConfig) {
  if (!currentNode.value) return
  patchNode({
    structured_output: nextStructuredOutput,
    output: {
      variables: buildLLMOutputVariables(currentNode.value.id, nextStructuredOutput)
    }
  } as Partial<OFLLMNodeData>)
}

function toggleStructuredOutput() {
  if (!nodeData.value) return
  const nextEnabled = !structuredEnabled.value
  syncStructuredOutput({
    enabled: nextEnabled,
    schema: nodeData.value.structured_output?.schema || null
  })
  if (nextEnabled && !nodeData.value.structured_output?.schema) {
    openSchemaEditor()
  }
}

function openSchemaEditor() {
  if (!currentNode.value) return
  objectSchemaEditorStore.open(currentNode.value.id, structuredSchema.value)
}

function handleSchemaSave(schema: OFJsonSchemaObject) {
  syncStructuredOutput({
    enabled: true,
    schema
  })
}

function openPromptVariableSelector(promptId: string, event: MouseEvent) {
  if (!currentNode.value) return
  const anchorRect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  const editorRef = promptEditorRefs.get(promptId)
  activePromptTarget.value = {
    promptId,
    cursorPosition: editorRef?.getCursorPosition?.() || 0
  }
  variableSelectorStore.openSelector(currentNode.value.id, 'prompt', activePromptTarget.value.cursorPosition, anchorRect)
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

function handleDebugFormUpdate(values: Record<string, string>) {
  if (!uiStore.selectedNodeId) return
  Object.entries(values).forEach(([key, value]) => {
    nodeDebugStore.setNodeFormValue(uiStore.selectedNodeId!, key, value)
  })
}

async function executeNodeDebug(values: Record<string, string>) {
  if (!editorStore.currentWorkflowId || !uiStore.selectedNodeId) return
  debugMode.value = false
  activeTab.value = 'lastRun'
  await nodeDebugStore.runNodeDebug({
    workflowId: editorStore.currentWorkflowId,
    nodeId: uiStore.selectedNodeId,
    inputs: { ...values }
  })
}

onMounted(() => {
  window.addEventListener('of:variable-select', handleVariableSelect as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('of:variable-select', handleVariableSelect as EventListener)
})
</script>

<style scoped>
.of-llm-node-panel {
  font-family: inherit;
}

.of-llm-node-panel input,
.of-llm-node-panel select,
.of-llm-node-panel textarea,
.of-llm-node-panel button {
  color: #111827;
}

.of-llm-node-panel textarea::placeholder,
.of-llm-node-panel input::placeholder {
  color: #9ca3af;
}

.of-llm-node-panel :deep(textarea),
.of-llm-node-panel :deep(input),
.of-llm-node-panel :deep(select) {
  color: #111827;
}
</style>
