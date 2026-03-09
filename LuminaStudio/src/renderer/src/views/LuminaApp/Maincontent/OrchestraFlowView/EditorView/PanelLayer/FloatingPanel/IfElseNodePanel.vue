<template>
  <div class="of-panel-shell" :class="theme.panelClass">
    <div class="of-panel-shell-header">
      <div class="of-panel-shell-title-row">
        <div class="of-panel-shell-icon" :class="theme.iconBgClass">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path
              d="M14 5h5v5h-2V8.414l-4.293 4.293L17 17v-1.5h2V20h-5v-2h1.586l-4-4H3v-2h8.586l4.293-4.293H14V5Z"
            />
          </svg>
        </div>
        <input
          v-model="titleModel"
          class="system-xl-semibold of-panel-shell-title-input"
          placeholder="添加标题..."
        />
        <div class="of-panel-shell-actions">
          <CapsuleTooltip text="查看文档" placement="bottom">
            <a
              href="https://docs.dify.ai/zh/use-dify/nodes/ifelse"
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
              type="button"
              class="of-panel-icon-button flex h-6 w-6 items-center justify-center rounded-md"
              @click="uiStore.closeNodeConfigPanel()"
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
          @click="activeTab = 'settings'"
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
          @click="activeTab = 'lastRun'"
        >
          上次运行
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'settings'" class="of-panel-shell-body overflow-x-hidden">
      <div class="of-panel-shell-body-inner of-doc-block">
        <div class="of-doc-kicker">分支逻辑配置</div>
        <div class="of-doc-divider"></div>

        <div class="of-branch-stack">
          <div v-for="item in cases" :key="item.id" class="of-branch-case of-branch-case-v7">
            <div class="of-branch-v7-tree">
              <div class="of-branch-v7-trunk"></div>
              <div class="of-branch-v7-body">
                <div
                  v-for="(condition, conditionIndex) in item.conditions"
                  :key="condition.id"
                  class="of-branch-v7-node"
                  :class="conditionIndex > 0 ? 'is-nested' : ''"
                >
                  <div class="of-branch-v7-line">
                    <span class="of-branch-v7-rail"></span>
                    <div class="of-branch-v7-content">
                      <div class="of-branch-line">
                        <span class="of-branch-keyword">
                          {{
                            item.kind === 'if'
                              ? conditionIndex === 0
                                ? 'if'
                                : condition.logical_operator === 'or'
                                  ? 'or'
                                  : 'and'
                              : conditionIndex === 0
                                ? 'else if'
                                : condition.logical_operator === 'or'
                                  ? 'or'
                                  : 'and'
                          }}
                        </span>
                        <span class="of-branch-v7-token">(</span>
                        <VariablePillButton
                          :text="condition.variable_path || ''"
                          placeholder="选择变量"
                          tooltip-max-width="520px"
                          @click="handleConditionVariableClick(item.id, condition.id, $event)"
                        />
                        <div
                          ref="operatorTriggerRefs"
                          :data-popup-key="`operator:${item.id}:${condition.id}`"
                          class="of-choice-anchor"
                        >
                          <button
                            type="button"
                            class="of-branch-operator"
                            @click.stop="toggleOperatorPicker(item.id, condition.id)"
                          >
                            {{ getOperatorLabel(condition.operator, condition.variable_type) }}
                          </button>
                        </div>
                        <Teleport to="body">
                          <div
                            v-if="isOperatorPickerOpen(item.id, condition.id)"
                            class="of-choice-popup of-choice-popup-fixed"
                            :style="getChoicePopupStyle(`operator:${item.id}:${condition.id}`)"
                          >
                            <button
                              v-for="option in getOperators(condition.variable_type)"
                              :key="String(option.value)"
                              type="button"
                              class="of-choice-option"
                              :class="
                                String(option.value) === condition.operator
                                  ? 'of-choice-option-active'
                                  : ''
                              "
                              @click.stop="
                                selectOperator(item.id, condition.id, String(option.value))
                              "
                            >
                              {{ option.label }}
                            </button>
                          </div>
                        </Teleport>
                        <template v-if="needsValue(condition.operator)">
                          <input
                            v-if="condition.variable_type !== OFVarType.Boolean"
                            :type="condition.variable_type === OFVarType.Number ? 'number' : 'text'"
                            :value="condition.value ?? ''"
                            class="of-branch-inline-input"
                            :class="condition.variable_type === OFVarType.Number ? 'w-12' : 'w-20'"
                            placeholder="值"
                            @input="
                              handleValueInput(
                                item.id,
                                condition.id,
                                condition.variable_type,
                                $event
                              )
                            "
                          />
                          <div
                            v-else
                            ref="operatorTriggerRefs"
                            :data-popup-key="`boolean:${item.id}:${condition.id}`"
                            class="of-choice-anchor"
                          >
                            <button
                              type="button"
                              class="of-branch-operator"
                              @click.stop="toggleBooleanPicker(item.id, condition.id)"
                            >
                              {{ condition.value === false ? 'FALSE' : 'TRUE' }}
                            </button>
                          </div>
                          <Teleport to="body">
                            <div
                              v-if="isBooleanPickerOpen(item.id, condition.id)"
                              class="of-choice-popup of-choice-popup-fixed"
                              :style="getChoicePopupStyle(`boolean:${item.id}:${condition.id}`)"
                            >
                              <button
                                type="button"
                                class="of-choice-option"
                                :class="condition.value === true ? 'of-choice-option-active' : ''"
                                @click.stop="selectBooleanValue(item.id, condition.id, true)"
                              >
                                TRUE
                              </button>
                              <button
                                type="button"
                                class="of-choice-option"
                                :class="condition.value === false ? 'of-choice-option-active' : ''"
                                @click.stop="selectBooleanValue(item.id, condition.id, false)"
                              >
                                FALSE
                              </button>
                            </div>
                          </Teleport>
                        </template>
                        <span class="of-branch-v7-token">)</span>
                      </div>

                      <div class="of-branch-v7-result">
                        <span class="of-branch-v7-result-label">去</span>
                        <span class="system-sm-medium text-gray-700">
                          {{ getBranchTargetText(item.handleId) }}
                        </span>
                      </div>

                      <span class="of-branch-actions">
                        <button
                          type="button"
                          class="of-branch-action"
                          @click="addCondition(item.id)"
                        >
                          添加条件
                        </button>
                        <button
                          v-if="conditionIndex > 0"
                          type="button"
                          class="of-branch-action of-branch-action-danger"
                          @click="removeCondition(item.id, condition.id)"
                        >
                          删除条件
                        </button>
                        <button
                          v-if="item.kind === 'elif' && conditionIndex === 0"
                          type="button"
                          class="of-branch-action of-branch-action-danger"
                          @click="removeCase(item.id)"
                        >
                          删除分支
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="of-branch-case of-branch-case-v7">
            <div class="of-branch-v7-tree">
              <div class="of-branch-v7-trunk"></div>
              <div class="of-branch-v7-body">
                <div class="of-branch-v7-node">
                  <div class="of-branch-v7-line">
                    <span class="of-branch-v7-rail"></span>
                    <div class="of-branch-v7-content">
                      <div class="of-branch-line">
                        <span class="of-branch-keyword">else</span>
                      </div>
                      <div class="of-branch-v7-result">
                        <span class="of-branch-v7-result-label">去</span>
                        <span class="system-sm-medium text-gray-700">
                          {{ getBranchTargetText(nodeData?.elseCase.handleId) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button type="button" class="of-state-inline-action" @click="addElif">添加 else if</button>
      </div>
    </div>

    <div v-else class="of-panel-shell-body">
      <div class="of-panel-shell-body-inner">
        <NodeDebugLastRun
          :result="nodeDebugResult"
          :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import {
  OFVarType,
  type OFIfElseCondition,
  type OFIfElseNodeData
} from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import NodeDebugLastRun from './NodeDebug/NodeDebugLastRun.vue'
import CapsuleTooltip from './components/CapsuleTooltip.vue'
import VariablePillButton from './components/VariablePillButton.vue'
import { OF_PANEL_THEME } from './panel-theme'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()

const activeTab = ref<'settings' | 'lastRun'>('settings')
const activeConditionTarget = ref<{ caseId: string; conditionId: string } | null>(null)
const activeChoicePopup = ref<{
  kind: 'operator' | 'boolean'
  caseId: string
  conditionId: string
} | null>(null)
const popupPosition = ref<Record<string, { top: number; left: number }>>({})
const operatorTriggerRefs = ref<HTMLElement[]>([])
const theme = OF_PANEL_THEME.ifelse

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId) || null
})

const nodeData = computed(() => currentNode.value?.data as OFIfElseNodeData | undefined)
const cases = computed(() => nodeData.value?.cases || [])
const nodeDebugResult = computed(() => {
  const nodeId = uiStore.selectedNodeId
  return nodeId ? nodeDebugStore.getLastRun(nodeId) : undefined
})

const titleModel = computed({
  get: () => nodeData.value?.title || '条件分支',
  set: (value: string) => patchNode({ title: value })
})

const descModel = computed({
  get: () => nodeData.value?.desc || '',
  set: (value: string) => patchNode({ desc: value })
})

const OPERATOR_OPTIONS = {
  default: [
    { value: 'is', label: '等于' },
    { value: 'is_not', label: '不等于' },
    { value: 'contains', label: '包含' },
    { value: 'not_contains', label: '不包含' },
    { value: 'starts_with', label: '开头是' },
    { value: 'ends_with', label: '结尾是' },
    { value: 'is_empty', label: '为空' },
    { value: 'is_not_empty', label: '不为空' }
  ],
  number: [
    { value: 'is', label: '等于' },
    { value: 'is_not', label: '不等于' },
    { value: 'gt', label: '大于' },
    { value: 'gte', label: '大于等于' },
    { value: 'lt', label: '小于' },
    { value: 'lte', label: '小于等于' },
    { value: 'is_empty', label: '为空' },
    { value: 'is_not_empty', label: '不为空' }
  ],
  boolean: [
    { value: 'is', label: '是' },
    { value: 'is_not', label: '不是' }
  ]
}

function patchNode(patch: Partial<OFIfElseNodeData>) {
  if (!currentNode.value) return
  editorStore.updateNode(currentNode.value.id, patch)
}

function patchCases(nextCases: OFIfElseNodeData['cases']) {
  patchNode({ cases: nextCases })
}

function getBranchTargetText(handleId?: string) {
  if (!currentNode.value?.id || !handleId) {
    return '未连接'
  }

  const matchedEdge = editorStore.edges.find(
    (edge) => edge.source === currentNode.value?.id && edge.sourceHandle === handleId
  )

  if (!matchedEdge) {
    return '未连接'
  }

  const targetNode = editorStore.findNodeById(matchedEdge.target)
  return String(targetNode?.data?.title || matchedEdge.target).trim() || '未连接'
}

function createCondition(): OFIfElseCondition {
  return {
    id: `condition_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    variable_selector: [],
    operator: 'is',
    value: '',
    value_type: OFVarType.String
  }
}

function updateCondition(caseId: string, conditionId: string, patch: Partial<OFIfElseCondition>) {
  patchCases(
    cases.value.map((item) =>
      item.id === caseId
        ? {
            ...item,
            conditions: item.conditions.map((condition) =>
              condition.id === conditionId ? { ...condition, ...patch } : condition
            )
          }
        : item
    )
  )
}

function addCondition(caseId: string) {
  patchCases(
    cases.value.map((item) =>
      item.id === caseId
        ? {
            ...item,
            conditions: [
              ...item.conditions,
              {
                ...createCondition(),
                logical_operator: 'and'
              }
            ]
          }
        : item
    )
  )
}

function removeCondition(caseId: string, conditionId: string) {
  patchCases(
    cases.value.map((item) =>
      item.id === caseId
        ? {
            ...item,
            conditions: item.conditions.filter((condition) => condition.id !== conditionId)
          }
        : item
    )
  )
}

function addElif() {
  const elifCount = cases.value.filter((item) => item.kind === 'elif').length + 1
  patchCases([
    ...cases.value,
    {
      id: `case_elif_${Date.now()}`,
      kind: 'elif',
      label: `ELIF ${elifCount}`,
      handleId: `elif-${elifCount}`,
      conditions: [createCondition()]
    }
  ])
}

function removeCase(caseId: string) {
  patchCases(cases.value.filter((item) => item.id !== caseId))
}

function openConditionSelector(caseId: string, conditionId: string, event: MouseEvent) {
  if (!currentNode.value) return
  activeConditionTarget.value = { caseId, conditionId }
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(currentNode.value.id, 'condition', anchorRect, undefined, {
    x: event.clientX,
    y: event.clientY
  })
}

function handleConditionVariableClick(caseId: string, conditionId: string, event: Event) {
  openConditionSelector(caseId, conditionId, event as MouseEvent)
}

function handleValueInput(
  caseId: string,
  conditionId: string,
  type: OFIfElseCondition['variable_type'],
  event: Event
) {
  const raw = (event.target as HTMLInputElement).value
  updateCondition(caseId, conditionId, {
    value: type === OFVarType.Number ? Number(raw || 0) : raw
  })
}

function needsValue(operator: OFIfElseCondition['operator']) {
  return operator !== 'is_empty' && operator !== 'is_not_empty'
}

function getOperators(type?: OFIfElseCondition['variable_type']) {
  if (type === OFVarType.Number) return OPERATOR_OPTIONS.number
  if (type === OFVarType.Boolean) return OPERATOR_OPTIONS.boolean
  return OPERATOR_OPTIONS.default
}

function getOperatorLabel(
  operator: OFIfElseCondition['operator'],
  type?: OFIfElseCondition['variable_type']
) {
  return getOperators(type).find((option) => option.value === operator)?.label || '选择比较'
}

function toggleOperatorPicker(caseId: string, conditionId: string) {
  if (isOperatorPickerOpen(caseId, conditionId)) {
    activeChoicePopup.value = null
    return
  }
  activeChoicePopup.value = { kind: 'operator', caseId, conditionId }
  void nextTick(() => updateChoicePopupPosition(`operator:${caseId}:${conditionId}`))
}

function toggleBooleanPicker(caseId: string, conditionId: string) {
  if (isBooleanPickerOpen(caseId, conditionId)) {
    activeChoicePopup.value = null
    return
  }
  activeChoicePopup.value = { kind: 'boolean', caseId, conditionId }
  void nextTick(() => updateChoicePopupPosition(`boolean:${caseId}:${conditionId}`))
}

function isOperatorPickerOpen(caseId: string, conditionId: string) {
  return (
    activeChoicePopup.value?.kind === 'operator' &&
    activeChoicePopup.value.caseId === caseId &&
    activeChoicePopup.value.conditionId === conditionId
  )
}

function isBooleanPickerOpen(caseId: string, conditionId: string) {
  return (
    activeChoicePopup.value?.kind === 'boolean' &&
    activeChoicePopup.value.caseId === caseId &&
    activeChoicePopup.value.conditionId === conditionId
  )
}

function selectOperator(caseId: string, conditionId: string, operator: string) {
  updateCondition(caseId, conditionId, {
    operator: operator as OFIfElseCondition['operator']
  })
  activeChoicePopup.value = null
}

function selectBooleanValue(caseId: string, conditionId: string, value: boolean) {
  updateCondition(caseId, conditionId, { value })
  activeChoicePopup.value = null
}

function findChoiceTrigger(popupKey: string) {
  return operatorTriggerRefs.value.find((element) => element.dataset.popupKey === popupKey) || null
}

function updateChoicePopupPosition(popupKey: string) {
  const trigger = findChoiceTrigger(popupKey)
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  popupPosition.value = {
    ...popupPosition.value,
    [popupKey]: {
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2
    }
  }
}

function getChoicePopupStyle(popupKey: string) {
  const position = popupPosition.value[popupKey]
  if (!position) {
    return {
      top: '-9999px',
      left: '-9999px'
    }
  }

  return {
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translateX(-50%)'
  }
}

function closePopup() {
  activeChoicePopup.value = null
}

function handleGlobalPointerDown(event: Event) {
  const target = event.target as HTMLElement | null
  if (target?.closest('.of-choice-anchor')) {
    return
  }
  closePopup()
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePopup()
  }
}

function handleWindowLayoutChange() {
  if (!activeChoicePopup.value) return
  updateChoicePopupPosition(
    `${activeChoicePopup.value.kind}:${activeChoicePopup.value.caseId}:${activeChoicePopup.value.conditionId}`
  )
}

function handleVariableSelect(event: Event) {
  const detail = (event as CustomEvent).detail
  if (
    detail?.nodeId !== uiStore.selectedNodeId ||
    detail?.targetType !== 'condition' ||
    !activeConditionTarget.value
  ) {
    return
  }

  updateCondition(activeConditionTarget.value.caseId, activeConditionTarget.value.conditionId, {
    variable_selector: detail.variable.valueSelector,
    variable_path: detail.variable.path,
    variable_label: detail.variable.path,
    variable_type: detail.variable.type,
    value_type:
      detail.variable.type === OFVarType.Boolean
        ? OFVarType.Boolean
        : detail.variable.type === OFVarType.Number
          ? OFVarType.Number
          : OFVarType.String,
    operator:
      detail.variable.type === OFVarType.Number
        ? 'is'
        : detail.variable.type === OFVarType.Boolean
          ? 'is'
          : 'contains',
    value:
      detail.variable.type === OFVarType.Boolean
        ? true
        : detail.variable.type === OFVarType.Number
          ? 0
          : ''
  })

  activeConditionTarget.value = null
}

onMounted(() => {
  window.addEventListener('of:variable-select', handleVariableSelect as EventListener)
  window.addEventListener('pointerdown', handleGlobalPointerDown)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('scroll', handleWindowLayoutChange, true)
  window.addEventListener('resize', handleWindowLayoutChange)
})

onUnmounted(() => {
  window.removeEventListener('of:variable-select', handleVariableSelect as EventListener)
  window.removeEventListener('pointerdown', handleGlobalPointerDown)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('scroll', handleWindowLayoutChange, true)
  window.removeEventListener('resize', handleWindowLayoutChange)
})
</script>

<style scoped src="../../../styles/node-panel.scss"></style>
