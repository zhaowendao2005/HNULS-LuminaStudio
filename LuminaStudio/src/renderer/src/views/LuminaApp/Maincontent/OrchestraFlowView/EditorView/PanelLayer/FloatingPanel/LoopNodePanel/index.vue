<template>
  <div class="of-panel-shell of-loop-node-panel" :class="theme.panelClass">
    <div class="of-panel-shell-header">
      <div class="of-panel-shell-title-row">
        <div class="of-panel-shell-icon" :class="theme.iconBgClass">
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M20 11A8 8 0 1 0 6.062 16.938M20 11V4m0 7h-7M4 13a8 8 0 0 0 13.938 5.938M4 13v7m0-7h7"
              stroke-linecap="round"
              stroke-linejoin="round"
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
          <CapsuleTooltip text="关闭面板" placement="bottom">
            <button
              class="of-panel-icon-button flex h-6 w-6 items-center justify-center rounded-md"
              @click="handleClose"
            >
              <svg viewBox="0 0 24 24" class="of-panel-icon-svg h-4 w-4" fill="currentColor">
                <path
                  d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.0502 5.63672L11.9997 10.5865Z"
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
        <LoopVariableSection
          :model-value="loopVariables"
          :theme="theme"
          :type-options="typeOptions"
          @add="addLoopVariable"
          @remove="removeLoopVariable"
          @patch="patchLoopVariable"
          @open-selector="openLoopVariableSelector"
          @schema="openLoopVariableSchema"
        />

        <div class="of-doc-divider"></div>

        <LoopConditionSection
          :model-value="breakConditions"
          :logical-operator="logicalOperator"
          :theme="theme"
          @add="addBreakCondition"
          @remove="removeBreakCondition"
          @patch="patchBreakCondition"
          @open-left-selector="openConditionLeftSelector"
          @open-right-selector="openConditionRightSelector"
          @update:logical-operator="patchNode({ logical_operator: $event })"
        />

        <div class="of-doc-divider"></div>

        <LoopLimitSection
          :model-value="loopCount"
          :theme="theme"
          @update:model-value="patchNode({ loop_count: $event })"
        />

        <ObjectSchemaEditor @save="handleSchemaSave" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  OFIfElseCondition,
  OFLoopNodeData,
  OFLoopVariableData,
  OFStructuredJsonSchema,
  OFVarType
} from '@shared/Orchestraflow-types'
import {
  OFBlockEnum,
  OFVarType as OFVarTypeEnum,
  OF_LOOP_COUNT_VARIABLE_NAME,
  OF_LOOP_INDEX_VARIABLE_NAME,
  getOFSelectorFromRef
} from '@shared/Orchestraflow-types'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import { useObjectSchemaEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/object-schema-editor/object-schema-editor.store'
import { useLoopNodeConfigStore } from '@renderer/stores/orchestraflow/workflow-editor/node-config/loop-node-config/loop-node-config.store'
import type { WhiteSelectOption } from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
import type { NodeDebugField } from '../NodeDebug/NodeDebugForm.vue'
import NodeDebugForm from '../NodeDebug/NodeDebugForm.vue'
import NodeDebugLastRun from '../NodeDebug/NodeDebugLastRun.vue'
import CapsuleTooltip from '../components/CapsuleTooltip.vue'
import ObjectSchemaEditor from '../ObjectSchemaEditor/index.vue'
import { OF_PANEL_THEME } from '../panel-theme'
import LoopVariableSection from './components/LoopVariableSection.vue'
import LoopConditionSection from './components/LoopConditionSection.vue'
import LoopLimitSection from './components/LoopLimitSection.vue'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()
const objectSchemaEditorStore = useObjectSchemaEditorStore()
const configStore = useLoopNodeConfigStore()
const theme = OF_PANEL_THEME.loop

const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)
const activeLoopVariableId = ref<string | null>(null)
const activeConditionId = ref<string | null>(null)
const activeConditionSide = ref<'left' | 'right' | null>(null)
const activeSchemaTarget = ref<{ variableId: string; mode: 'object' } | null>(null)

const typeOptions: WhiteSelectOption[] = [
  { label: 'string', value: OFVarTypeEnum.String },
  { label: 'number', value: OFVarTypeEnum.Number },
  { label: 'boolean', value: OFVarTypeEnum.Boolean },
  { label: 'array', value: OFVarTypeEnum.Array },
  { label: 'object', value: OFVarTypeEnum.Object }
]

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId) || null
})

const nodeData = computed(() => currentNode.value?.data as OFLoopNodeData | undefined)
const loopVariables = computed(() => nodeData.value?.loop_variables || [])
const breakConditions = computed(() => nodeData.value?.break_conditions || [])
const logicalOperator = computed(() => nodeData.value?.logical_operator || 'and')
const loopCount = computed(() => Math.max(1, Number(nodeData.value?.loop_count || 1)))

const titleModel = computed({
  get: () => nodeData.value?.title || '循环',
  set: (value: string) => patchNode({ title: value })
})

const descModel = computed({
  get: () => nodeData.value?.desc || '',
  set: (value: string) => patchNode({ desc: value })
})

const debugFields = computed<NodeDebugField[]>(() => {
  const fields = new Map<string, NodeDebugField>()
  const localKeys = new Set([
    ...loopVariables.value.map((item) => item.variable),
    OF_LOOP_INDEX_VARIABLE_NAME,
    OF_LOOP_COUNT_VARIABLE_NAME
  ])
  const collect = (selector?: string[], type?: OFVarType | string) => {
    const rootKey = selector?.[0]
    if (!rootKey || localKeys.has(rootKey) || fields.has(rootKey)) return
    fields.set(rootKey, {
      key: rootKey,
      label: rootKey,
      type: type || OFVarTypeEnum.String,
      required: false,
      placeholder: `请输入 ${rootKey}`
    })
  }

  loopVariables.value.forEach((item) => {
    if (item.value_source?.mode === 'variable') collect(item.value_source.ref.selector, item.type)
  })
  breakConditions.value.forEach((item) => {
    collect(item.variable_ref?.selector, item.variable_type)
    if (item.compare_source_mode === 'variable')
      collect(item.compare_ref?.selector, item.compare_type)
  })
  return [...fields.values()]
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
  if (tab !== 'settings') debugMode.value = false
}

function enterDebugMode() {
  debugMode.value = true
  activeTab.value = 'settings'
}

function handleClose() {
  uiStore.closeNodeConfigPanel()
}

function patchNode(patch: Partial<OFLoopNodeData>) {
  if (!currentNode.value) return
  configStore.patchConfig(patch as any)
  editorStore.updateNode(currentNode.value.id, patch)
}

function normalizeConstantValue(variable: OFLoopVariableData, raw: any) {
  if (variable.type === OFVarTypeEnum.Number) return raw === '' ? '' : Number(raw)
  if (variable.type === OFVarTypeEnum.Object || variable.type === OFVarTypeEnum.Array) {
    if (typeof raw !== 'string') return raw
    if (!raw.trim()) return raw
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}

function patchLoopVariable(variableId: string, patch: Partial<OFLoopVariableData>) {
  patchNode({
    loop_variables: loopVariables.value.map((item) =>
      (item.id || item.variable) === variableId
        ? {
            ...item,
            ...patch,
            value:
              patch.value !== undefined
                ? normalizeConstantValue({ ...item, ...patch }, patch.value)
                : item.value
          }
        : item
    )
  })
}

function addLoopVariable() {
  const nextVariable = configStore.createDefaultLoopVariable()
  const variableName = configStore.createUniqueLoopVariableName(loopVariables.value)
  patchNode({
    loop_variables: [
      ...loopVariables.value,
      {
        ...nextVariable,
        variable: variableName,
        label: ''
      }
    ]
  })
}

function removeLoopVariable(variableId: string) {
  const nextVariables = loopVariables.value.filter(
    (item) => (item.id || item.variable) !== variableId
  )
  patchNode({ loop_variables: nextVariables })
}

function addBreakCondition() {
  patchNode({ break_conditions: [...breakConditions.value, configStore.createDefaultCondition()] })
}

function removeBreakCondition(conditionId: string) {
  patchNode({ break_conditions: breakConditions.value.filter((item) => item.id !== conditionId) })
}

function patchBreakCondition(conditionId: string, patch: Partial<OFIfElseCondition>) {
  patchNode({
    break_conditions: breakConditions.value.map((item) =>
      item.id === conditionId ? { ...item, ...patch } : item
    )
  })
}

function openLoopVariableSelector(variableId: string, event: MouseEvent) {
  if (!uiStore.selectedNodeId) return
  activeLoopVariableId.value = variableId
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'loop-variable-init',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    }
  )
}

function openConditionLeftSelector(conditionId: string, event: MouseEvent) {
  if (!uiStore.selectedNodeId) return
  activeConditionId.value = conditionId
  activeConditionSide.value = 'left'
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'loop-condition-left',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    }
  )
}

function openConditionRightSelector(conditionId: string, event: MouseEvent) {
  if (!uiStore.selectedNodeId) return
  activeConditionId.value = conditionId
  activeConditionSide.value = 'right'
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'loop-condition-right',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    }
  )
}

function openLoopVariableSchema(variableId: string, mode: 'object') {
  if (!currentNode.value) return
  const item = loopVariables.value.find((entry) => (entry.id || entry.variable) === variableId)
  if (!item) return
  activeSchemaTarget.value = { variableId, mode }
  objectSchemaEditorStore.open(currentNode.value.id, item.schema || null)
}

function handleSchemaSave(schema: OFStructuredJsonSchema) {
  if (!activeSchemaTarget.value) return
  patchLoopVariable(activeSchemaTarget.value.variableId, {
    schema
  })
  activeSchemaTarget.value = null
}

function handleVariableSelect(event: Event) {
  const detail = (event as CustomEvent).detail
  if (detail?.nodeId !== uiStore.selectedNodeId) return

  if (detail.targetType === 'loop-variable-init' && activeLoopVariableId.value) {
    patchLoopVariable(activeLoopVariableId.value, {
      value_source: {
        mode: 'variable',
        ref: {
          selector: detail.variable.valueSelector || [],
          path: detail.variable.path,
          label: detail.variable.label,
          type: detail.variable.type,
          schema: detail.variable.schema || null
        }
      },
      value_type: 'variable'
    })
    activeLoopVariableId.value = null
    return
  }

  if (
    (detail.targetType === 'loop-condition-left' || detail.targetType === 'loop-condition-right') &&
    activeConditionId.value
  ) {
    if (activeConditionSide.value === 'left') {
      patchBreakCondition(activeConditionId.value, {
        variable_ref: {
          selector: detail.variable.valueSelector || [],
          path: detail.variable.path,
          label: detail.variable.label,
          type: detail.variable.type,
          schema: detail.variable.schema || null
        },
        variable_type: detail.variable.type
      })
    } else {
      patchBreakCondition(activeConditionId.value, {
        compare_source_mode: 'variable',
        compare_ref: {
          selector: detail.variable.valueSelector || [],
          path: detail.variable.path,
          label: detail.variable.label,
          type: detail.variable.type,
          schema: detail.variable.schema || null
        },
        compare_type: detail.variable.type
      })
    }
    activeConditionId.value = null
    activeConditionSide.value = null
  }
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
    if (!currentNode.value || currentNode.value.data.type !== OFBlockEnum.Loop) return
    configStore.loadConfig(currentNode.value.id, {
      ...(currentNode.value.data as OFLoopNodeData),
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

<style scoped src="../../../../styles/node-panel.scss"></style>
