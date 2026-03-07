<template>
  <div class="flex h-full flex-col">
    <div class="border-b border-gray-100 px-4 pb-2 pt-4">
      <div class="flex items-center gap-3">
        <div
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white"
          :class="theme.iconBgClass"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path
              d="M14 5h5v5h-2V8.414l-4.293 4.293L17 17v-1.5h2V20h-5v-2h1.586l-4-4H3v-2h8.586l4.293-4.293H14V5Z"
            />
          </svg>
        </div>
        <input
          v-model="titleModel"
          class="system-xl-semibold h-7 min-w-0 flex-1 appearance-none rounded-md border border-transparent bg-transparent px-1 text-gray-900 outline-none focus:shadow-xs"
          placeholder="添加标题..."
        />
        <div class="flex shrink-0 items-center gap-1">
          <CapsuleTooltip text="查看文档" placement="bottom">
            <a
              href="https://docs.dify.ai/zh/use-dify/nodes/ifelse"
              target="_blank"
              class="flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-400" fill="currentColor">
                <path
                  d="M13 21V23H11V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H9C10.1947 3 11.2671 3.52375 12 4.35418C12.7329 3.52375 13.8053 3 15 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H13ZM20 19V5H15C13.8954 5 13 5.89543 13 7V19H20ZM11 19V7C11 5.89543 10.1046 5 9 5H4V19H11Z"
                />
              </svg>
            </a>
          </CapsuleTooltip>
          <CapsuleTooltip text="关闭面板" placement="bottom">
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100"
              @click="uiStore.closeNodeConfigPanel()"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-400" fill="currentColor">
                <path
                  d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"
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
          :class="
            activeTab === 'settings' ? theme.tabActiveClass : 'border-transparent text-gray-400'
          "
          @click="activeTab = 'settings'"
        >
          设置
        </button>
        <button
          class="system-md-semibold border-b-2 pb-2 pt-2.5"
          :class="
            activeTab === 'lastRun' ? theme.tabActiveClass : 'border-transparent text-gray-400'
          "
          @click="activeTab = 'lastRun'"
        >
          上次运行
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'settings'" class="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
      <div class="space-y-6">
        <div
          v-for="item in cases"
          :key="item.id"
          class="group relative rounded-xl bg-gray-50/50 p-3 transition hover:bg-gray-50"
        >
          <div class="mb-2 flex items-center gap-2">
            <div
              class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              :class="item.kind === 'if' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'"
            >
              {{ item.label }}
            </div>
            <div class="flex-1 border-b border-dashed border-gray-200"></div>
            <div
              class="flex gap-1 transition"
              :class="
                item.kind === 'if'
                  ? 'opacity-0 group-hover:opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              "
            >
              <button
                type="button"
                class="rounded border border-gray-100 bg-white p-1 text-gray-400 shadow-sm transition hover:text-cyan-600"
                @click="addCondition(item.id)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
              <button
                v-if="item.kind === 'elif'"
                type="button"
                class="rounded border border-gray-100 bg-white p-1 text-gray-400 shadow-sm transition hover:text-red-500"
                @click="removeCase(item.id)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <div
              v-for="(condition, conditionIndex) in item.conditions"
              :key="condition.id"
              class="group/row text-sm"
            >
              <div
                class="grid items-center gap-x-2 gap-y-1.5"
                style="grid-template-columns: 56px minmax(0, 1fr) 96px 24px"
              >
                <button
                  v-if="conditionIndex > 0"
                  type="button"
                  class="h-6 w-14 rounded border px-1 py-0.5 text-[10px] font-bold uppercase transition"
                  :class="
                    (condition.logical_operator || 'and') === 'and'
                      ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                  "
                  @click="
                    updateCondition(item.id, condition.id, {
                      logical_operator:
                        (condition.logical_operator || 'and') === 'and' ? 'or' : 'and'
                    })
                  "
                >
                  {{ (condition.logical_operator || 'and') === 'and' ? 'AND' : 'OR' }}
                </button>
                <div v-else class="w-14 shrink-0"></div>

                <div class="min-w-0">
                  <VariablePillButton
                    :text="condition.variable_path || ''"
                    placeholder="选择变量"
                    :button-class="theme.controlFocusClass"
                    tooltip-max-width="520px"
                    @click="handleConditionVariableClick(item.id, condition.id, $event)"
                  >
                    <template #icon>
                      <svg
                        class="mr-1.5 h-3.5 w-3.5 shrink-0 text-cyan-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                        />
                      </svg>
                    </template>
                  </VariablePillButton>
                </div>

                <WhiteSelect
                  :model-value="condition.operator"
                  :options="getOperators(condition.variable_type)"
                  root-class="w-full min-w-0"
                  trigger-class="!h-8 !w-full !rounded-md !border-transparent !bg-transparent !px-1 !py-1 !text-sm !text-gray-400 hover:!bg-white hover:!text-gray-700"
                  panel-class="min-w-[132px]"
                  teleport-to="body"
                  @update:model-value="
                    updateCondition(item.id, condition.id, { operator: String($event) as any })
                  "
                />

                <button
                  type="button"
                  class="justify-self-end rounded p-1 text-gray-300 opacity-0 transition-all hover:text-red-500 group-hover/row:opacity-100"
                  @click="removeCondition(item.id, condition.id)"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <div v-if="needsValue(condition.operator)" class="col-start-2 col-end-4 min-w-0">
                  <!-- Boolean value toggle -->
                  <button
                    v-if="condition.variable_type === OFVarType.Boolean"
                    type="button"
                    class="inline-flex h-8 max-w-full items-center overflow-hidden rounded-md border border-gray-200 bg-white p-0.5 shadow-sm"
                    :class="theme.controlFocusClass"
                  >
                    <span
                      class="min-w-[54px] rounded-[5px] px-2 text-center text-xs font-semibold leading-7 transition"
                      :class="
                        condition.value === true
                          ? 'bg-green-50 text-green-700 shadow-sm'
                          : 'text-gray-400'
                      "
                      @click="updateCondition(item.id, condition.id, { value: true })"
                    >
                      TRUE
                    </span>
                    <span
                      class="min-w-[54px] rounded-[5px] px-2 text-center text-xs font-semibold leading-7 transition"
                      :class="
                        condition.value === false
                          ? 'bg-rose-50 text-rose-700 shadow-sm'
                          : 'text-gray-400'
                      "
                      @click="updateCondition(item.id, condition.id, { value: false })"
                    >
                      FALSE
                    </span>
                  </button>

                  <!-- Number/String value input -->
                  <input
                    v-else
                    :type="condition.variable_type === OFVarType.Number ? 'number' : 'text'"
                    :value="condition.value ?? ''"
                    class="w-full rounded-md border border-transparent bg-white px-2 py-1 text-sm text-gray-900 outline-none transition placeholder:text-gray-300"
                    :class="theme.controlFocusClass"
                    placeholder="输入值"
                    @input="
                      handleValueInput(item.id, condition.id, condition.variable_type, $event)
                    "
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center pt-2">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:border-cyan-200 hover:text-cyan-600"
            @click="addElif"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        <section class="rounded-xl border border-gray-200 bg-[#f8fafc] px-5 py-4">
          <div class="text-[10px] font-bold uppercase tracking-wide text-gray-500">ELSE</div>
          <div class="mt-3 text-sm leading-7 text-gray-500">
            当前前面的 IF / ELIF 都不满足时，放行 ELSE 分支。
          </div>
        </section>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto px-4 py-4">
      <NodeDebugLastRun
        :result="nodeDebugResult"
        :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  OFVarType,
  type OFIfElseCondition,
  type OFIfElseNodeData
} from '@shared/Orchestraflow-types'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import WhiteSelect, {
  type WhiteSelectOption
} from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
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
const theme = OF_PANEL_THEME.ifelse

const logicalOperatorOptions: WhiteSelectOption[] = [
  { label: 'AND', value: 'and' },
  { label: 'OR', value: 'or' }
]

const booleanValueOptions: WhiteSelectOption[] = [
  { label: 'true', value: 'true' },
  { label: 'false', value: 'false' }
]

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

const OPERATOR_OPTIONS: Record<string, WhiteSelectOption[]> = {
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
            conditions: [...item.conditions, createCondition()]
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
})

onUnmounted(() => {
  window.removeEventListener('of:variable-select', handleVariableSelect as EventListener)
})
</script>
