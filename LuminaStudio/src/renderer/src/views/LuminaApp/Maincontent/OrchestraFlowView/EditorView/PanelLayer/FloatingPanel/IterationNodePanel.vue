<template>
  <div class="of-panel-shell of-iteration-node-panel" :class="theme.panelClass">
    <div class="of-panel-shell-header">
      <div class="of-panel-shell-title-row">
        <div class="of-panel-shell-icon" :class="theme.iconBgClass">
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
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
          <CapsuleTooltip text="查看文档" placement="bottom">
            <a
              href="https://docs.dify.ai/zh/use-dify/nodes/iteration"
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
      <div v-if="activeTab === 'settings' && !debugMode" class="of-panel-shell-body-inner">
        <section class="of-panel-section of-panel-container-section">
          <div class="flex items-center justify-between">
            <div class="system-sm-semibold-uppercase text-gray-700">
              输入数组
              <span class="text-red-500">*</span>
            </div>
            <div
              class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              :class="theme.softBadgeClass"
            >
              ARRAY
            </div>
          </div>
          <button class="of-panel-variable-button" @click="openInputVariableSelector">
            <div class="of-panel-variable-button-content">
              <span class="of-panel-variable-button-label of-panel-variable-button-label-input">
                输入变量
              </span>
              <span
                class="of-panel-variable-button-placeholder"
                :class="iteratorSelectorDisplayText ? '!text-cyan-700' : ''"
              >
                {{ iteratorSelectorDisplayText || '点击选择数组变量' }}
              </span>
            </div>
          </button>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <template v-if="branchOutputTargets.length === 0">
            <div class="flex items-center justify-between">
              <div class="system-sm-semibold-uppercase text-gray-700">
                结果项变量
                <span class="text-red-500">*</span>
              </div>
              <div
                class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                :class="theme.softBadgeClass"
              >
                INTERNAL
              </div>
            </div>
            <button class="of-panel-variable-button" @click="openOutputVariableSelector">
              <div class="of-panel-variable-button-content">
                <span class="of-panel-variable-button-label of-panel-variable-button-label-output">
                  输出变量
                </span>
                <span
                  class="of-panel-variable-button-placeholder"
                  :class="outputSelectorDisplayText ? '!text-emerald-700' : ''"
                >
                  {{ outputSelectorDisplayText || '点击选择内部输出变量' }}
                </span>
              </div>
            </button>
          </template>

          <template v-else>
            <div class="flex items-center justify-between">
              <div class="system-sm-semibold-uppercase text-gray-700">支路结果变量</div>
              <div
                class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                :class="theme.softBadgeClass"
              >
                BRANCH
              </div>
            </div>
            <div class="of-panel-list">
              <div
                v-for="branchTarget in branchOutputTargets"
                :key="branchTarget.key"
                class="of-panel-list-card"
              >
                <div class="mb-2 flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-gray-800">
                      {{ branchTarget.label }}
                    </div>
                    <div class="truncate text-xs text-gray-400">
                      {{ branchTarget.nodeTitle }}
                    </div>
                  </div>
                  <div class="text-[10px] uppercase text-gray-400">
                    {{ branchTarget.sourceHandleId }}
                  </div>
                </div>
                <button
                  class="of-panel-variable-button"
                  @click="openBranchOutputVariableSelector(branchTarget, $event)"
                >
                  <div class="of-panel-variable-button-content">
                    <span class="of-panel-variable-button-label text-amber-600">
                      {{ branchTarget.label }}
                    </span>
                    <span
                      class="of-panel-variable-button-placeholder max-w-[220px]"
                      :class="getBranchSelectorDisplayText(branchTarget) ? '!text-amber-700' : ''"
                    >
                      {{ getBranchSelectorDisplayText(branchTarget) || '点击选择该分支输出变量' }}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </template>
          <div class="text-xs leading-5 text-gray-400">
            存在条件分支时，需要为每条支路分别配置导出变量；运行时会按当前 item 实际命中的支路取值。
          </div>
        </section>

        <section class="of-panel-section of-panel-container-section">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
              <div class="system-sm-semibold-uppercase text-gray-700">并行执行</div>
              <CapsuleTooltip text="开启后将按并发数并行处理每一轮输入。" placement="top">
                <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-300" fill="currentColor">
                  <path
                    d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2 22 6.477 22 12 17.523 22 12 22ZM11 10V17H13V10H11ZM11 7V9H13V7H11Z"
                  />
                </svg>
              </CapsuleTooltip>
            </div>
            <button
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="parallelModeModel ? 'bg-[#32acd0]' : 'bg-[#d1d5db]'"
              @click="parallelModeModel = !parallelModeModel"
            >
              <span
                class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                :class="parallelModeModel ? 'translate-x-5' : 'translate-x-1'"
              />
            </button>
          </div>

          <div v-if="parallelModeModel" class="of-panel-field-stack">
            <div class="system-sm-semibold-uppercase text-gray-700">并发数</div>
            <input
              v-model.number="parallelNumsModel"
              type="number"
              min="1"
              max="10"
              class="of-panel-input h-11"
            />
          </div>

          <div class="of-panel-field-stack">
            <div class="system-sm-semibold-uppercase text-gray-700">错误策略</div>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="option in errorHandleOptions"
                :key="option.value"
                class="flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition"
                :class="
                  errorHandleModeModel === option.value
                    ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                    : 'border-[#e5e7eb] bg-[#f3f4f6] text-gray-700 hover:border-cyan-200 hover:bg-white'
                "
                @click="errorHandleModeModel = option.value"
              >
                <span>{{ option.label }}</span>
                <span class="text-xs text-gray-400">{{ option.value }}</span>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
              <div class="system-sm-semibold-uppercase text-gray-700">扁平化输出</div>
              <CapsuleTooltip text="开启后会对每轮结果数组做一层扁平化。" placement="top">
                <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-300" fill="currentColor">
                  <path
                    d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2 22 6.477 22 12 17.523 22 12 22ZM11 10V17H13V10H11ZM11 7V9H13V7H11Z"
                  />
                </svg>
              </CapsuleTooltip>
            </div>
            <ToggleSwitch v-model="flattenOutputModel" />
          </div>
        </section>

        <section class="of-doc-section">
          <MechanismHintCard
            title="容器规则说明"
            description="这些说明直接来自共享 container mechanism，不再由面板手写一份。"
            :primary-rules="containerMechanismHints.hardRules"
            :notes="containerMechanismHints.contextNotes"
            :warning="containerMechanismHints.failureModes[0]"
          />
        </section>

        <section class="of-doc-section">
          <div class="flex items-center justify-between">
            <div>
              <div class="of-doc-title-strong">输出预览</div>
              <div class="of-state-hint">{{ outputNamespaceLabel }}</div>
            </div>
          </div>

          <div class="of-output-tree">
            <div class="of-output-tree-root">
              <span class="of-output-tree-root-label">Output</span>
            </div>

            <div
              v-for="(item, index) in outputPreviewVariables"
              :key="item.variable"
              class="of-output-tree-item of-output-tree-branch"
              :class="{ 'of-output-tree-item-last': index === outputPreviewVariables.length - 1 }"
            >
              <span class="of-output-tree-prop">{{ item.variable }}</span>
              <span>:</span>
              <span class="of-output-tree-type">{{ item.type || 'string' }}</span>
            </div>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  OFIterationErrorHandleMode,
  OFIterationBranchOutputRef,
  OFIfElseNodeData,
  OFIterationNodeData,
  OFVarType
} from '@shared/Orchestraflow-types'
import { OFBlockEnum, getOFPathFromRef } from '@shared/Orchestraflow-types'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import { useIterationNodeConfigStore } from '@renderer/stores/orchestraflow/workflow-editor/node-config/iteration-node-config/iteration-node-config.store'
import type { NodeDebugField } from './NodeDebug/NodeDebugForm.vue'
import NodeDebugForm from './NodeDebug/NodeDebugForm.vue'
import NodeDebugLastRun from './NodeDebug/NodeDebugLastRun.vue'
import CapsuleTooltip from './components/CapsuleTooltip.vue'
import MechanismHintCard from './components/MechanismHintCard.vue'
import { OF_PANEL_THEME } from './panel-theme'
import ToggleSwitch from '../Components/ToggleSwitch/index.vue'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()
const configStore = useIterationNodeConfigStore()
const theme = OF_PANEL_THEME.iteration

const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)

const errorHandleOptions: Array<{ value: OFIterationErrorHandleMode; label: string }> = [
  { value: 'terminated', label: '错误时终止' },
  { value: 'continue-on-error', label: '错误时继续' },
  { value: 'remove-abnormal-output', label: '移除异常输出' }
]

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId) || null
})

const nodeData = computed(() => currentNode.value?.data as OFIterationNodeData | undefined)

const titleModel = computed({
  get: () => nodeData.value?.title || '迭代',
  set: (value: string) => patchNode({ title: value })
})

const descModel = computed({
  get: () => nodeData.value?.desc || '',
  set: (value: string) => patchNode({ desc: value })
})

const iteratorSelectorDisplayText = computed(() => getOFPathFromRef(nodeData.value?.iterator_ref))
const outputSelectorDisplayText = computed(() => getOFPathFromRef(nodeData.value?.output_ref))
const outputPreviewVariables = computed(() => nodeData.value?.output?.variables || [])
const outputNamespaceLabel = computed(() => nodeData.value?.title || 'iteration')
const containerMechanismHints = computed(() =>
  editorStore.getContainerMechanismHints(uiStore.selectedNodeId)
)
const branchOutputTargets = computed(() => {
  const subgraphNodes = nodeData.value?.subgraph?.nodes || []
  return subgraphNodes
    .filter((node) => node.data.type === OFBlockEnum.IfElse)
    .flatMap((node) => {
      const data = node.data as OFIfElseNodeData
      const nodeTitle = data.title || '条件分支'
      const caseTargets = (data.cases || []).map((item) => ({
        key: `${node.id}:${item.handleId}`,
        sourceNodeId: node.id,
        sourceHandleId: item.handleId,
        label: item.label,
        nodeTitle
      }))
      return [
        ...caseTargets,
        {
          key: `${node.id}:${data.elseCase.handleId}`,
          sourceNodeId: node.id,
          sourceHandleId: data.elseCase.handleId,
          label: data.elseCase.label,
          nodeTitle
        }
      ]
    })
})

const parallelModeModel = computed({
  get: () => nodeData.value?.parallel_mode === 'parallel',
  set: (value: boolean) => patchNode({ parallel_mode: value ? 'parallel' : 'sequential' })
})

const parallelNumsModel = computed({
  get: () => Math.max(1, Number(nodeData.value?.parallel_nums || 1)),
  set: (value: number) =>
    patchNode({ parallel_nums: Math.max(1, Math.min(10, Number(value || 1))) })
})

const flattenOutputModel = computed({
  get: () => Boolean(nodeData.value?.flatten_output ?? true),
  set: (value: boolean) => patchNode({ flatten_output: value })
})

const errorHandleModeModel = computed<OFIterationErrorHandleMode>({
  get: () => nodeData.value?.error_handle_mode || 'terminated',
  set: (value) => patchNode({ error_handle_mode: value })
})

const debugFields = computed<NodeDebugField[]>(() => {
  const selector = nodeData.value?.iterator_ref?.selector || []
  if (!selector.length) {
    return []
  }

  const path = selector.join('.')
  return [
    {
      key: path,
      label: path,
      type: 'array' as OFVarType,
      required: true,
      placeholder: `请输入 ${path} 对应的 JSON 数组`
    }
  ]
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

function patchNode(patch: Partial<OFIterationNodeData>) {
  if (!currentNode.value) return
  configStore.patchConfig(patch as any)
  editorStore.updateNode(currentNode.value.id, patch)
}

function openInputVariableSelector(event: MouseEvent) {
  if (!uiStore.selectedNodeId) return
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'iteration-input',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    }
  )
}

function openOutputVariableSelector(event: MouseEvent) {
  if (!uiStore.selectedNodeId) return
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'iteration-output',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    }
  )
}

function openBranchOutputVariableSelector(
  branchTarget: {
    sourceNodeId: string
    sourceHandleId: string
  },
  event: MouseEvent
) {
  if (!uiStore.selectedNodeId) return
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'iteration-output',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    },
    {
      branchSourceNodeId: branchTarget.sourceNodeId,
      branchSourceHandleId: branchTarget.sourceHandleId
    }
  )
}

function getBranchSelectorDisplayText(branchTarget: {
  sourceNodeId: string
  sourceHandleId: string
}) {
  const matchedSelector = (nodeData.value?.branch_output_selectors || []).find(
    (item) =>
      item.source_node_id === branchTarget.sourceNodeId &&
      item.source_handle_id === branchTarget.sourceHandleId
  )
  return matchedSelector?.output_ref ? getOFPathFromRef(matchedSelector.output_ref) : ''
}

function patchBranchOutputSelector(
  sourceNodeId: string,
  sourceHandleId: string,
  outputSelector: string[]
) {
  const currentSelectors = nodeData.value?.branch_output_selectors || []
  const nextSelectors = [...currentSelectors]
  const existingIndex = nextSelectors.findIndex(
    (item) => item.source_node_id === sourceNodeId && item.source_handle_id === sourceHandleId
  )
  const nextItem: OFIterationBranchOutputRef = {
    source_node_id: sourceNodeId,
    source_handle_id: sourceHandleId,
    output_ref: {
      selector: outputSelector,
      path: outputSelector.join('.')
    }
  }

  if (existingIndex >= 0) {
    nextSelectors[existingIndex] = nextItem
  } else {
    nextSelectors.push(nextItem)
  }

  patchNode({ branch_output_selectors: nextSelectors })
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

function handleVariableSelect(event: Event) {
  const detail = (event as CustomEvent).detail
  if (detail?.nodeId !== uiStore.selectedNodeId) return

  if (detail.targetType === 'iteration-input') {
    patchNode({
      iterator_ref: {
        selector: detail.variable.valueSelector || [],
        path: detail.variable.path,
        label: detail.variable.label,
        type: detail.variable.type,
        schema: detail.variable.schema || null
      }
    })
    return
  }

  if (detail.targetType === 'iteration-output') {
    if (detail.branchSourceNodeId && detail.branchSourceHandleId) {
      patchBranchOutputSelector(
        detail.branchSourceNodeId,
        detail.branchSourceHandleId,
        detail.variable.valueSelector || []
      )
      return
    }

    patchNode({
      output_ref: {
        selector: detail.variable.valueSelector || [],
        path: detail.variable.path,
        label: detail.variable.label,
        type: detail.variable.type,
        schema: detail.variable.schema || null
      }
    })
  }
}

watch(
  () => uiStore.selectedNodeId,
  () => {
    debugMode.value = false
    if (!currentNode.value || currentNode.value.data.type !== 'iteration') return
    configStore.loadConfig(currentNode.value.id, {
      ...(currentNode.value.data as OFIterationNodeData),
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

<style scoped src="../../../styles/node-panel.scss"></style>
