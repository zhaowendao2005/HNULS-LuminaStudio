<template>
  <div class="h-full flex flex-col">
    <div class="border-b border-gray-100 px-4 pb-2 pt-4">
      <div class="flex items-center gap-3">
        <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-white">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path d="M14 5h5v5h-2V8.414l-4.293 4.293L17 17v-1.5h2V20h-5v-2h1.586l-4-4H3v-2h8.586l4.293-4.293H14V5Z" />
          </svg>
        </div>
        <input
          v-model="titleModel"
          class="system-xl-semibold h-7 min-w-0 flex-1 appearance-none rounded-md border border-transparent bg-transparent px-1 text-gray-900 outline-none focus:shadow-xs"
          placeholder="添加标题..."
        />
        <div class="flex shrink-0 items-center gap-1">
          <a
            href="https://docs.dify.ai/zh/use-dify/nodes/ifelse"
            target="_blank"
            class="flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-400" fill="currentColor">
              <path d="M13 21V23H11V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H9C10.1947 3 11.2671 3.52375 12 4.35418C12.7329 3.52375 13.8053 3 15 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H13ZM20 19V5H15C13.8954 5 13 5.89543 13 7V19H20ZM11 19V7C11 5.89543 10.1046 5 9 5H4V19H11Z" />
            </svg>
          </a>
          <button class="flex h-6 w-6 items-center justify-center" @click="uiStore.closeNodeConfigPanel()">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-gray-400" fill="currentColor">
              <path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z" />
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
          :class="activeTab === 'settings' ? 'border-cyan-500 text-gray-900' : 'border-transparent text-gray-400'"
          @click="activeTab = 'settings'"
        >
          设置
        </button>
        <button
          class="system-md-semibold border-b-2 pb-2 pt-2.5"
          :class="activeTab === 'lastRun' ? 'border-cyan-500 text-gray-900' : 'border-transparent text-gray-400'"
          @click="activeTab = 'lastRun'"
        >
          上次运行
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'settings'" class="flex-1 overflow-y-auto px-4 py-4">
      <div class="space-y-4">
        <div
          v-for="item in cases"
          :key="item.id"
          class="rounded-2xl border border-gray-200 bg-white p-3"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="text-sm font-semibold uppercase tracking-wide text-gray-700">
              {{ item.label }}
            </div>
            <button
              v-if="item.kind === 'elif'"
              class="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              @click="removeCase(item.id)"
            >
              删除
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="(condition, conditionIndex) in item.conditions"
              :key="condition.id"
              class="rounded-2xl bg-[#f8fafc] p-3"
            >
              <div v-if="conditionIndex > 0" class="mb-2">
                <select
                  :value="condition.logical_operator || 'and'"
                  class="h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium uppercase text-gray-600 outline-none focus:border-cyan-400"
                  @change="updateCondition(item.id, condition.id, { logical_operator: ($event.target as HTMLSelectElement).value as 'and' | 'or' })"
                >
                  <option value="and">AND</option>
                  <option value="or">OR</option>
                </select>
              </div>

              <div class="grid grid-cols-[1.4fr_0.9fr_1fr_auto] gap-2">
                <button
                  class="flex h-10 items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:border-cyan-300"
                  @click="openConditionSelector(item.id, condition.id, $event)"
                >
                  <span class="truncate">
                    {{ condition.variable_path || '选择变量' }}
                  </span>
                  <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-gray-400" fill="currentColor">
                    <path d="M14.6 16.6L19.2 12L14.6 7.4L16 6L22 12L16 18L14.6 16.6ZM9.4 16.6L4.8 12L9.4 7.4L8 6L2 12L8 18L9.4 16.6Z" />
                  </svg>
                </button>

                <select
                  :value="condition.operator"
                  class="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-cyan-400"
                  @change="updateCondition(item.id, condition.id, { operator: ($event.target as HTMLSelectElement).value as any })"
                >
                  <option
                    v-for="operator in getOperators(condition.variable_type)"
                    :key="operator.value"
                    :value="operator.value"
                  >
                    {{ operator.label }}
                  </option>
                </select>

                <template v-if="needsValue(condition.operator)">
                  <select
                    v-if="condition.variable_type === OFVarType.Boolean"
                    :value="String(condition.value ?? true)"
                    class="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-cyan-400"
                    @change="updateCondition(item.id, condition.id, { value: ($event.target as HTMLSelectElement).value === 'true' })"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>

                  <input
                    v-else
                    :type="condition.variable_type === OFVarType.Number ? 'number' : 'text'"
                    :value="condition.value ?? ''"
                    class="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-cyan-400"
                    placeholder="输入值"
                    @input="handleValueInput(item.id, condition.id, condition.variable_type, $event)"
                  />
                </template>

                <div v-else class="flex h-10 items-center rounded-xl border border-dashed border-gray-200 px-3 text-xs text-gray-400">
                  无需值
                </div>

                <button
                  class="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500"
                  @click="removeCondition(item.id, condition.id)"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                    <path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              class="w-full rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-cyan-300 hover:text-cyan-600"
              @click="addCondition(item.id)"
            >
              添加条件
            </button>
          </div>
        </div>

        <button
          class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="addElif"
        >
          添加 ELIF
        </button>

        <div class="rounded-2xl border border-gray-200 bg-[#f8fafc] px-4 py-3">
          <div class="text-sm font-semibold uppercase text-gray-700">ELSE</div>
          <div class="mt-1 text-xs leading-5 text-gray-500">
            当前面的 IF / ELIF 都不满足时，放行 ELSE 分支。
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto px-4 py-4">
      <NodeDebugLastRun :result="nodeDebugResult" :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId" />
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
import NodeDebugLastRun from './NodeDebug/NodeDebugLastRun.vue'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()

const activeTab = ref<'settings' | 'lastRun'>('settings')
const activeConditionTarget = ref<{ caseId: string; conditionId: string } | null>(null)

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.nodes.find((node) => node.id === uiStore.selectedNodeId) || null
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
} as const

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
  const anchorRect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(currentNode.value.id, 'condition', anchorRect)
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
