<template>
  <div class="of-panel-shell of-llm-node-panel" :class="theme.panelClass">
    <div class="of-panel-shell-header">
      <div class="of-panel-shell-title-row">
        <div class="of-panel-shell-icon" :class="theme.iconBgClass">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path
              d="M12 2a7 7 0 0 0-7 7v2.5a2.5 2.5 0 0 0-1 2v1a2.5 2.5 0 0 0 2.5 2.5H8v2a3 3 0 0 0 3 3h2v-2h-2a1 1 0 0 1-1-1v-2.086A2.497 2.497 0 0 0 11.5 14.5v-1A2.5 2.5 0 0 0 10 11.086V9a5 5 0 1 1 10 0v2.086A2.5 2.5 0 0 0 18.5 13.5v1a2.5 2.5 0 0 0 2.5 2.5H22v-8a10 10 0 0 0-10-10Z"
            />
          </svg>
        </div>

        <input
          v-model="titleModel"
          class="system-xl-semibold of-panel-shell-title-input"
          placeholder="添加标题..."
        />

        <div class="of-panel-shell-actions">
          <CapsuleTooltip text="调试运行" placement="bottom">
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
          </CapsuleTooltip>
          <CapsuleTooltip text="查看文档" placement="bottom">
            <a
              href="https://docs.dify.ai/zh/use-dify/nodes/llm"
              target="_blank"
              class="of-panel-icon-button flex h-6 w-6 items-center justify-center rounded-md"
            >
              <svg viewBox="0 0 24 24" class="of-panel-icon-svg h-4 w-4" fill="currentColor">
                <path
                  d="M13 21V23H11V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H9C10.1947 3 11.2671 3.52375 12 4.35418C12.7329 3.52375 13.8053 3 15 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H13ZM20 19V5H15C13.8954 5 13 5.89543 13 7V19H20ZM11 19V7C11 5.89543 10.1046 5 9 5H4V19H11Z"
                />
              </svg>
            </a>
          </CapsuleTooltip>
          <CapsuleTooltip text="关闭面板" placement="bottom">
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
          </CapsuleTooltip>
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
      <div
        v-if="activeTab === 'settings' && !debugMode"
        class="of-panel-shell-body-inner of-doc-block"
      >
        <section class="of-doc-section">
          <div class="of-doc-title-row">
            <div class="of-doc-title-strong">模型配置</div>
            <CapsuleTooltip
              text="模型选择器会同时绑定 Provider 与模型名称；点击模型名即可切换。"
              placement="top"
              max-width="280px"
            >
              <span class="of-info-trigger" aria-label="模型配置说明">
                <span class="of-info-trigger-icon">i</span>
              </span>
            </CapsuleTooltip>
          </div>
          <div class="of-doc-inline-sentence">
            <span>使用</span>
            <button type="button" class="of-ref-trigger" @click="modelSelectorVisible = true">
              <span class="of-ref-text">{{ selectedModelDisplay }}</span>
            </button>
            <span>模型进行生成，Provider 为</span>
            <span class="of-doc-inline-code">{{ selectedProviderName }}</span>
            <span>。</span>
          </div>
        </section>

        <div class="of-doc-divider"></div>

        <section class="of-doc-section">
          <div class="flex items-center justify-between gap-3">
            <div class="of-doc-title-row">
              <div class="of-doc-title-strong">提示词</div>
              <CapsuleTooltip
                text="支持插入变量，格式为 {{ variable.path }}。角色颜色仅用于帮助快速识别消息来源。"
                placement="top"
                max-width="320px"
              >
                <span class="of-info-trigger" aria-label="提示词说明">
                  <span class="of-info-trigger-icon">i</span>
                </span>
              </CapsuleTooltip>
            </div>
            <button class="of-state-inline-action" @click="addPrompt">添加消息</button>
          </div>

          <div v-if="promptItems.length === 0" class="of-state-empty">
            暂无 Prompt，点击“添加消息”开始配置。
          </div>

          <div v-for="item in promptItems" :key="item.id" class="of-doc-message-item">
            <div class="of-doc-message-head">
              <div class="of-doc-role-switch">
                <CapsuleTooltip
                  v-for="option in promptRoleOptions"
                  :key="String(option.value)"
                  :text="getPromptRoleCaption(String(option.value))"
                  placement="top"
                >
                  <button
                    type="button"
                    class="of-doc-role-option"
                    :class="[
                      `of-doc-role-option-${String(option.value)}`,
                      { 'is-active': item.role === option.value }
                    ]"
                    @click="updatePromptRole(item.id, option.value)"
                  >
                    {{ option.label }}
                  </button>
                </CapsuleTooltip>
              </div>
              <div class="of-doc-message-actions">
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
              :height="96"
              placeholder="输入消息内容..."
              @update:model-value="updatePrompt(item.id, { text: $event })"
            />
          </div>
        </section>

        <div class="of-doc-divider"></div>

        <section class="of-doc-section">
          <div class="flex items-center justify-between gap-3">
            <div class="of-doc-title-row">
              <div class="of-doc-title-strong">输出结构</div>
              <CapsuleTooltip
                text="输出变量按代码结构预览，仅展示最终暴露给后续节点的字段层级。"
                placement="top"
                max-width="280px"
              >
                <span class="of-info-trigger" aria-label="输出结构说明">
                  <span class="of-info-trigger-icon">i</span>
                </span>
              </CapsuleTooltip>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                结构化输出
              </div>
              <ToggleSwitch v-model="structuredEnabled" />
            </div>
          </div>

          <div class="of-output-tree">
            <div class="of-output-tree-root">
              <span class="of-output-tree-root-label">Output</span>
            </div>

            <div
              v-for="(item, index) in baseOutputs"
              :key="item.variable"
              class="of-output-tree-item of-output-tree-branch"
              :class="{
                'of-output-tree-item-last': index === baseOutputs.length - 1 && !structuredEnabled
              }"
            >
              <span class="of-output-tree-prop">{{ item.variable }}</span>
              <span>:</span>
              <span class="of-output-tree-type">{{ item.type || 'string' }}</span>
            </div>

            <template v-if="structuredEnabled">
              <div class="of-output-tree-divider">
                <span class="of-output-tree-divider-label">格式化输出</span>
              </div>
              <div class="of-output-tree-item of-output-tree-branch of-output-tree-item-last">
                <span class="of-output-tree-prop">
                  {{ structuredOutputVariable?.variable || 'structured_output' }}
                </span>
                <span>:</span>
                <span class="of-output-tree-type">
                  {{ structuredOutputVariable?.type || 'object' }}
                </span>
              </div>

              <div class="mt-2 pl-5">
                <button type="button" class="of-state-inline-action" @click="openSchemaEditor">
                  {{ structuredSchemaFields.length ? '编辑 Schema' : '配置 Schema' }}
                </button>
              </div>

              <div v-if="structuredSchemaFields.length" class="of-output-tree-nested">
                <div
                  v-for="(field, fieldIndex) in structuredSchemaFields"
                  :key="field.name"
                  class="of-output-tree-item of-output-tree-branch"
                  :class="{
                    'of-output-tree-item-last': fieldIndex === structuredSchemaFields.length - 1
                  }"
                >
                  <span class="of-output-tree-prop">{{ field.name }}</span>
                  <span>:</span>
                  <span class="of-output-tree-type">{{ field.type }}</span>
                </div>
              </div>
            </template>
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
        <NodeDebugLastRun
          :result="nodeDebugResult"
          :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
        />
      </div>
    </div>

    <ObjectSchemaEditor @save="handleSchemaSave" />
    <ModelSelector
      v-model:visible="modelSelectorVisible"
      :current-provider-id="providerIdModel || null"
      :current-model-id="modelNameModel || null"
      title="选择 LLM 模型"
      search-placeholder="搜索 Provider 或模型..."
      :show-manage-button="false"
      @select="handleModelSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  OFLLMNodeData,
  OFPromptItem,
  OFStructuredJsonSchema,
  OFStructuredOutputConfig
} from '@shared/Orchestraflow-types'
import { llmOutputVariableDefinition } from '@shared/Orchestraflow-types'
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
import CapsuleTooltip from './components/CapsuleTooltip.vue'
import ModelSelector from '@renderer/components/ModelSelector/index.vue'
import type { Model, ModelProvider } from '@renderer/stores/model-config/types'
import { OF_PANEL_THEME } from './panel-theme'
import ToggleSwitch from '../Components/ToggleSwitch/index.vue'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()
const objectSchemaEditorStore = useObjectSchemaEditorStore()
const modelConfigStore = useModelConfigStore()

const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)
const modelSelectorVisible = ref(false)
const theme = OF_PANEL_THEME.llm
const promptRoleOptions = [
  { label: 'SYSTEM', value: 'system' },
  { label: 'USER', value: 'user' },
  { label: 'ASSISTANT', value: 'assistant' }
] as const
const promptEditorRefs = new Map<string, { getCursorPosition: () => number }>()
const activePromptTarget = ref<{ promptId: string; cursorPosition: number } | null>(null)

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId) || null
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
    const exists = (nextProvider?.models || []).some(
      (item) => item.id === nodeData.value?.model?.name
    )
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
const structuredEnabled = ref(Boolean(nodeData.value?.structured_output?.enabled))

watch(
  () => nodeData.value?.structured_output?.enabled,
  (newEnabled) => {
    structuredEnabled.value = Boolean(newEnabled)
  }
)

watch(structuredEnabled, (newValue) => {
  if (!nodeData.value) return
  syncStructuredOutput({
    enabled: newValue,
    schema: nodeData.value.structured_output?.schema || null
  })
})

const autoOutputs = computed(() => {
  if (!nodeData.value) return []
  return llmOutputVariableDefinition.build({
    namespace: nodeData.value.title || 'llm',
    structuredOutput: nodeData.value.structured_output
  })
})
const baseOutputs = computed(() =>
  autoOutputs.value.filter((item) => item.variable !== 'structured_output')
)
const structuredOutputVariable = computed(
  () => autoOutputs.value.find((item) => item.variable === 'structured_output') || null
)
const structuredSchemaFields = computed(() => {
  const schema = structuredSchema.value
  if (!schema) return []
  const requiredSet = new Set(schema.required || [])
  return Object.entries(schema.properties || {}).map(([name, item]) => ({
    name,
    type: item.type,
    required: requiredSet.has(name)
  }))
})
const selectedProviderName = computed(() => {
  const provider = providers.value.find((item) => item.id === providerIdModel.value)
  return provider?.name || '未选择 Provider'
})
const selectedModelDisplay = computed(() => {
  const model = availableModels.value.find((item) => item.id === modelNameModel.value)
  const modelName = model?.name || modelNameModel.value || '未选择模型'
  return `${selectedProviderName.value} / ${modelName}`
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
  const next = promptItems.value.map((item) =>
    item.id === promptId ? { ...item, ...patch } : item
  )
  patchNode({ prompt_template: next } as Partial<OFLLMNodeData>)
}

function updatePromptRole(promptId: string, value: string | number | null) {
  if (!value) return
  updatePrompt(promptId, { role: String(value) as OFPromptItem['role'] })
}

function getPromptRoleCaption(role: string) {
  if (role === 'system') return '定义模型的全局行为与约束。'
  if (role === 'assistant') return '补充模型前置回复或示例语气。'
  return '提供本轮任务输入与上下文。'
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
  if (!nodeData.value) return
  patchNode({
    structured_output: nextStructuredOutput,
    output: {
      variables: llmOutputVariableDefinition.build({
        namespace: nodeData.value.title || 'llm',
        structuredOutput: nextStructuredOutput
      })
    }
  } as Partial<OFLLMNodeData>)
}

function handleModelSelect(payload: { provider: ModelProvider; model: Model }) {
  if (!nodeData.value || !currentNode.value) return
  editorStore.updateNode(currentNode.value.id, {
    model: {
      ...nodeData.value.model,
      provider: payload.provider.id,
      name: payload.model.id
    }
  } as Partial<OFLLMNodeData>)
}

function handleSchemaSave(schema: OFStructuredJsonSchema) {
  syncStructuredOutput({
    enabled: true,
    schema
  })
  structuredEnabled.value = true
}

function openSchemaEditor() {
  if (!currentNode.value) return
  objectSchemaEditorStore.open(currentNode.value.id, structuredSchema.value)
}

function openPromptVariableSelector(promptId: string, event: MouseEvent) {
  if (!currentNode.value) return
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  const anchorPoint = {
    x: event.clientX,
    y: event.clientY
  }
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

onMounted(() => {
  modelConfigStore.fetchProviders()
  window.addEventListener('of:variable-select', handleVariableSelect as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('of:variable-select', handleVariableSelect as EventListener)
})
</script>

<style scoped src="../../../styles/node-panel.scss"></style>
