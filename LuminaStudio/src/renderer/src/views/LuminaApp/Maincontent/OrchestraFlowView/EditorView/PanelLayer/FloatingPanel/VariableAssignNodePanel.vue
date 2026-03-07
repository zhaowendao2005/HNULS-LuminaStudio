<template>
  <div class="of-variable-assign-node-panel h-full flex flex-col">
    <div class="border-b border-gray-100 px-4 pb-2 pt-4">
      <div class="flex items-center gap-3">
        <div
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white"
          :class="theme.iconBgClass"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M7 7H17M7 12H13M7 17H11M16 12L18 14L22 10"
            />
          </svg>
        </div>

        <input
          v-model="titleModel"
          class="system-xl-semibold h-7 min-w-0 flex-1 appearance-none rounded-md border border-transparent bg-transparent px-1 text-gray-900 outline-none focus:shadow-xs"
          placeholder="添加标题..."
        />

        <div class="flex shrink-0 items-center gap-1">
          <CapsuleTooltip text="调试运行" placement="bottom">
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
          </CapsuleTooltip>
          <CapsuleTooltip text="关闭面板" placement="bottom">
            <button class="flex h-6 w-6 items-center justify-center" @click="handleClose">
              <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-400" fill="currentColor">
                <path
                  d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.0502 5.63672L11.9997 10.5865Z"
                />
              </svg>
            </button>
          </CapsuleTooltip>
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
          :class="activeTab === 'settings' ? theme.tabActiveClass : 'border-transparent text-gray-400'"
          @click="setActiveTab('settings')"
        >
          设置
        </button>
        <button
          class="system-md-semibold border-b-2 pb-2 pt-2.5"
          :class="activeTab === 'lastRun' ? theme.tabActiveClass : 'border-transparent text-gray-400'"
          @click="setActiveTab('lastRun')"
        >
          上次运行
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="activeTab === 'settings' && !debugMode" class="space-y-5 px-4 py-4">
        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="system-sm-semibold-uppercase text-gray-700">赋值规则</div>
            <button
              type="button"
              class="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
              @click="addRule"
            >
              添加规则
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="rule in rules"
              :key="rule.id"
              class="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div class="mb-3 flex items-center justify-between">
                <div class="inline-flex rounded-lg bg-gray-100 p-0.5">
                  <button
                    type="button"
                    class="rounded-md px-3 py-1 text-xs font-medium transition"
                    :class="rule.source_mode === 'variable' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'"
                    @click="patchRule(rule.id, { source_mode: 'variable' })"
                  >
                    变量
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-3 py-1 text-xs font-medium transition"
                    :class="rule.source_mode === 'constant' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'"
                    @click="patchRule(rule.id, { source_mode: 'constant' })"
                  >
                    常量
                  </button>
                </div>
                <button
                  type="button"
                  class="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                  @click="removeRule(rule.id)"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                    <path
                      d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"
                    />
                  </svg>
                </button>
              </div>

              <div class="space-y-3">
                <div v-if="rule.source_mode === 'variable'" class="space-y-2">
                  <div class="system-sm-semibold-uppercase text-gray-700">来源变量</div>
                  <VariablePillButton
                    :text="rule.source_path || ''"
                    placeholder="选择来源变量"
                    :button-class="theme.controlFocusClass"
                    tooltip-max-width="520px"
                    @click="openRuleSelector(rule.id, $event)"
                  />
                  <input
                    :value="rule.source_path || ''"
                    class="h-10 w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-sm text-gray-800 outline-none focus:bg-white"
                    :class="theme.controlFocusClass"
                    placeholder="可手动补充 .field 或 .0.name"
                    @input="handleSourcePathInput(rule.id, ($event.target as HTMLInputElement).value)"
                  />
                </div>

                <div v-else class="space-y-2">
                  <div class="system-sm-semibold-uppercase text-gray-700">常量值</div>
                  <textarea
                    v-if="usesJsonConstantEditor(rule)"
                    :value="getConstantDisplayValue(rule)"
                    rows="4"
                    class="w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-2 font-mono text-sm text-gray-800 outline-none focus:bg-white"
                    :class="theme.controlFocusClass"
                    :placeholder="rule.target_type === OFVarTypeEnum.Array ? '请输入 JSON 数组，例如 []' : '请输入 JSON 对象，例如 {}'"
                    @input="patchRule(rule.id, { constant_value: ($event.target as HTMLTextAreaElement).value })"
                  />
                  <button
                    v-else-if="rule.target_type === OFVarTypeEnum.Boolean"
                    type="button"
                    class="inline-flex h-10 max-w-full items-center overflow-hidden rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm"
                  >
                    <span
                      class="min-w-[64px] rounded-[8px] px-2 text-center text-xs font-semibold leading-8 transition"
                      :class="rule.constant_value === true ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400'"
                      @click="patchRule(rule.id, { constant_value: true })"
                    >
                      TRUE
                    </span>
                    <span
                      class="min-w-[64px] rounded-[8px] px-2 text-center text-xs font-semibold leading-8 transition"
                      :class="rule.constant_value === false ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-gray-400'"
                      @click="patchRule(rule.id, { constant_value: false })"
                    >
                      FALSE
                    </span>
                  </button>
                  <input
                    v-else
                    :value="getConstantDisplayValue(rule)"
                    :type="rule.target_type === OFVarTypeEnum.Number ? 'number' : 'text'"
                    class="h-10 w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-sm text-gray-800 outline-none focus:bg-white"
                    :class="theme.controlFocusClass"
                    placeholder="请输入常量值"
                    @input="patchRule(rule.id, { constant_value: ($event.target as HTMLInputElement).value })"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <div class="system-sm-semibold-uppercase text-gray-700">目标变量名</div>
                      <button
                        type="button"
                        class="text-xs font-semibold text-cyan-600 transition hover:text-cyan-700"
                        @click="openTargetSelector(rule.id, $event)"
                      >
                        选择已有变量
                      </button>
                    </div>
                    <input
                      :value="rule.target_variable"
                      class="h-10 w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-sm text-gray-800 outline-none focus:bg-white"
                      :class="theme.controlFocusClass"
                      placeholder="例如 summary_text"
                      @input="patchRule(rule.id, { target_variable: ($event.target as HTMLInputElement).value })"
                    />
                  </div>
                  <div class="space-y-2">
                    <div class="system-sm-semibold-uppercase text-gray-700">目标类型</div>
                    <WhiteSelect
                      :model-value="rule.target_type"
                      :options="targetTypeOptions"
                      root-class="w-full"
                      trigger-class="!h-10 !w-full !rounded-xl !border-[#e5e7eb] !bg-[#f3f4f6] !px-3 !text-sm !text-gray-800"
                      panel-class="min-w-[140px]"
                      teleport-to="body"
                      @update:model-value="handleTargetTypeChange(rule.id, String($event) as OFVarType)"
                    />
                  </div>
                </div>

                <div v-if="rule.target_type === OFVarTypeEnum.Array" class="grid grid-cols-[1fr_auto] gap-3">
                  <div class="space-y-2">
                    <div class="system-sm-semibold-uppercase text-gray-700">数组元素类型</div>
                    <WhiteSelect
                      :model-value="rule.item_type || OFVarTypeEnum.String"
                      :options="arrayItemTypeOptions"
                      root-class="w-full"
                      trigger-class="!h-10 !w-full !rounded-xl !border-[#e5e7eb] !bg-[#f3f4f6] !px-3 !text-sm !text-gray-800"
                      panel-class="min-w-[140px]"
                      teleport-to="body"
                      @update:model-value="patchRule(rule.id, { item_type: String($event) as OFVarType })"
                    />
                  </div>
                  <button
                    v-if="rule.item_type === OFVarTypeEnum.Object"
                    type="button"
                    class="mt-[26px] h-10 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-medium text-sky-700 hover:bg-sky-100"
                    @click="openSchemaEditor(rule.id)"
                  >
                    配置 Schema
                  </button>
                </div>

                <div v-else-if="rule.target_type === OFVarTypeEnum.Object" class="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div>
                    <div class="text-sm font-medium text-gray-700">对象 Schema</div>
                    <div class="text-xs text-gray-400">{{ getSchemaSummary(rule) }}</div>
                  </div>
                  <button
                    type="button"
                    class="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                    @click="openSchemaEditor(rule.id)"
                  >
                    配置
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <div class="flex items-center justify-between">
            <div class="system-sm-semibold-uppercase text-gray-700">输出预览</div>
            <div class="text-xs text-gray-400">{{ outputNamespaceLabel }}</div>
          </div>

          <div class="space-y-3">
            <div v-for="item in outputPreviewVariables" :key="item.variable" class="space-y-1">
              <div class="flex min-w-0 items-center gap-2 leading-[18px]">
                <div class="truncate text-[13px] font-semibold text-gray-800">{{ item.variable }}</div>
                <div class="shrink-0 text-[12px] text-gray-500">{{ item.type || 'string' }}</div>
              </div>
              <div class="max-w-[280px] truncate text-xs text-gray-400">
                {{ formatSelector(item.value_selector) }}
              </div>
            </div>
          </div>
        </section>

        <ObjectSchemaEditor @save="handleSchemaSave" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  OFStructuredJsonSchema,
  OFVarType,
  OFVariableAssignNodeData,
  OFVariableAssignRule
} from '@shared/Orchestraflow-types'
import { OFBlockEnum, OFVarType as OFVarTypeEnum } from '@shared/Orchestraflow-types'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import { useObjectSchemaEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/object-schema-editor/object-schema-editor.store'
import { useVariableAssignNodeConfigStore } from '@renderer/stores/orchestraflow/workflow-editor/node-config/variable-assign-node-config/variable-assign-node-config.store'
import WhiteSelect, { type WhiteSelectOption } from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
import type { NodeDebugField } from './NodeDebug/NodeDebugForm.vue'
import NodeDebugForm from './NodeDebug/NodeDebugForm.vue'
import NodeDebugLastRun from './NodeDebug/NodeDebugLastRun.vue'
import CapsuleTooltip from './components/CapsuleTooltip.vue'
import VariablePillButton from './components/VariablePillButton.vue'
import ObjectSchemaEditor from './ObjectSchemaEditor/index.vue'
import { OF_PANEL_THEME } from './panel-theme'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()
const objectSchemaEditorStore = useObjectSchemaEditorStore()
const configStore = useVariableAssignNodeConfigStore()
const theme = OF_PANEL_THEME.variableAssign

const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)
const activeRuleId = ref<string | null>(null)
const activeSchemaRuleId = ref<string | null>(null)

const targetTypeOptions: WhiteSelectOption[] = [
  { label: 'string', value: OFVarTypeEnum.String },
  { label: 'number', value: OFVarTypeEnum.Number },
  { label: 'boolean', value: OFVarTypeEnum.Boolean },
  { label: 'object', value: OFVarTypeEnum.Object },
  { label: 'array', value: OFVarTypeEnum.Array }
]

const arrayItemTypeOptions: WhiteSelectOption[] = [
  { label: 'string', value: OFVarTypeEnum.String },
  { label: 'number', value: OFVarTypeEnum.Number },
  { label: 'boolean', value: OFVarTypeEnum.Boolean },
  { label: 'object', value: OFVarTypeEnum.Object }
]

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId) || null
})

const nodeData = computed(() => currentNode.value?.data as OFVariableAssignNodeData | undefined)
const rules = computed(() => nodeData.value?.rules || [])
const outputPreviewVariables = computed(() => nodeData.value?.output?.variables || [])
const outputNamespaceLabel = computed(() => nodeData.value?.title || 'assign')

const titleModel = computed({
  get: () => nodeData.value?.title || '变量赋值',
  set: (value: string) => patchNode({ title: value })
})

const descModel = computed({
  get: () => nodeData.value?.desc || '',
  set: (value: string) => patchNode({ desc: value })
})

const debugFields = computed<NodeDebugField[]>(() => {
  const fieldMap = new Map<string, NodeDebugField>()

  for (const rule of rules.value) {
    if (rule.source_mode !== 'variable' || !rule.source_selector?.length) continue
    const rootKey = rule.source_selector[0]
    if (!rootKey || fieldMap.has(rootKey)) continue

    let fieldType = rule.source_type || OFVarTypeEnum.String
    if (rule.source_selector.length > 1) {
      fieldType = /^\d+$/.test(rule.source_selector[1]) ? OFVarTypeEnum.Array : OFVarTypeEnum.Object
    }

    fieldMap.set(rootKey, {
      key: rootKey,
      label: rootKey,
      type: fieldType,
      required: true,
      placeholder:
        fieldType === OFVarTypeEnum.Array
          ? `请输入 ${rootKey} 对应的 JSON 数组`
          : fieldType === OFVarTypeEnum.Object
            ? `请输入 ${rootKey} 对应的 JSON 对象`
            : `请输入 ${rootKey}`
    })
  }

  return Array.from(fieldMap.values())
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

function enterDebugMode() {
  debugMode.value = true
  activeTab.value = 'settings'
}

function handleClose() {
  uiStore.closeNodeConfigPanel()
}

function patchNode(patch: Partial<OFVariableAssignNodeData>) {
  if (!currentNode.value) return
  configStore.patchConfig(patch as any)
  editorStore.updateNode(currentNode.value.id, patch)
}

function patchRule(ruleId: string, patch: Partial<OFVariableAssignRule>) {
  const nextRules = rules.value.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule))
  patchNode({ rules: nextRules })
}

function addRule() {
  const nextRules = [...rules.value, configStore.createDefaultRule()]
  patchNode({ rules: nextRules })
}

function removeRule(ruleId: string) {
  const nextRules = rules.value.filter((rule) => rule.id !== ruleId)
  patchNode({ rules: nextRules.length > 0 ? nextRules : [configStore.createDefaultRule()] })
}

function openRuleSelector(ruleId: string, event: MouseEvent) {
  if (!uiStore.selectedNodeId) return
  activeRuleId.value = ruleId
  const anchorRect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'variable-assign-source',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    }
  )
}

function openTargetSelector(ruleId: string, event: MouseEvent) {
  if (!uiStore.selectedNodeId) return
  activeRuleId.value = ruleId
  const anchorRect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'variable-assign-target',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    }
  )
}

function parseSelectorPath(value: string): string[] {
  return value
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function handleSourcePathInput(ruleId: string, value: string) {
  patchRule(ruleId, {
    source_path: value,
    source_selector: parseSelectorPath(value)
  })
}

function handleTargetTypeChange(ruleId: string, targetType: OFVarType) {
  const patch: Partial<OFVariableAssignRule> = {
    target_type: targetType
  }

  if (targetType !== OFVarTypeEnum.Array) {
    patch.item_type = undefined
    patch.item_schema = null
  } else if (!rules.value.find((rule) => rule.id === ruleId)?.item_type) {
    patch.item_type = OFVarTypeEnum.String
  }

  if (targetType !== OFVarTypeEnum.Object) {
    patch.schema = null
  }

  patchRule(ruleId, patch)
}

function usesJsonConstantEditor(rule: OFVariableAssignRule) {
  return rule.target_type === OFVarTypeEnum.Object || rule.target_type === OFVarTypeEnum.Array
}

function getConstantDisplayValue(rule: OFVariableAssignRule): string {
  const value = rule.constant_value
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function openSchemaEditor(ruleId: string) {
  const rule = rules.value.find((item) => item.id === ruleId)
  if (!rule || !currentNode.value) return
  activeSchemaRuleId.value = ruleId
  objectSchemaEditorStore.open(currentNode.value.id, rule.schema || null)
}

function getSchemaSummary(rule: OFVariableAssignRule) {
  if (!rule.schema) return '未配置 schema'
  return rule.schema.type === 'array' ? 'array<object>' : 'object'
}

function handleSchemaSave(schema: OFStructuredJsonSchema) {
  if (!activeSchemaRuleId.value) return
  const activeRule = rules.value.find((item) => item.id === activeSchemaRuleId.value)
  if (!activeRule) return

  if (activeRule.target_type === OFVarTypeEnum.Array) {
    patchRule(activeSchemaRuleId.value, {
      item_type: OFVarTypeEnum.Object,
      item_schema: schema.type === 'array' ? schema.items : schema,
      schema
    })
  } else {
    patchRule(activeSchemaRuleId.value, {
      schema: schema.type === 'array' ? schema.items : schema
    })
  }
}

function formatSelector(selector?: string[]) {
  return selector?.length ? selector.join('.') : ''
}

function handleVariableSelect(event: Event) {
  const detail = (event as CustomEvent).detail
  if (
    detail?.nodeId !== uiStore.selectedNodeId ||
    !activeRuleId.value
  ) {
    return
  }

  if (detail.targetType === 'variable-assign-source') {
    patchRule(activeRuleId.value, {
      source_mode: 'variable',
      source_selector: detail.variable.valueSelector || [],
      source_path: detail.variable.path,
      source_label: detail.variable.label,
      source_type: detail.variable.type
    })
    activeRuleId.value = null
    return
  }

  if (detail.targetType === 'variable-assign-target') {
    const rootVariable = detail.variable.valueSelector?.[0] || detail.variable.variable
    patchRule(activeRuleId.value, {
      target_variable: rootVariable,
      target_label: detail.variable.label || rootVariable,
      target_type: (detail.variable.type as OFVarType | undefined) || OFVarTypeEnum.String,
      item_type: detail.variable.type === OFVarTypeEnum.Array ? detail.variable.type : undefined,
      schema: detail.variable.schema || null
    })
  }
  activeRuleId.value = null
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

watch(
  () => uiStore.selectedNodeId,
  () => {
    debugMode.value = false
    if (!currentNode.value || currentNode.value.data.type !== OFBlockEnum.VariableAssign) return
    configStore.loadConfig(currentNode.value.id, {
      ...(currentNode.value.data as OFVariableAssignNodeData),
      nodeId: currentNode.value.id
    })
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('of:variable-select', handleVariableSelect as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('of:variable-select', handleVariableSelect as EventListener)
})
</script>

<style scoped>
.of-variable-assign-node-panel {
  font-family: inherit;
}
</style>
