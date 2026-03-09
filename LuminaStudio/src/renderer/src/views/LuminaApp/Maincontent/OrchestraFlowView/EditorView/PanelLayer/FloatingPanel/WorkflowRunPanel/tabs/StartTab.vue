<template>
  <div class="of-start-tab-4a2 h-full flex flex-col">
    <div v-if="!startNode" class="py-8 text-center">
      <div class="mb-2 text-gray-400">
        <svg
          class="mx-auto h-12 w-12 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div class="system-md-regular text-gray-500">未找到开始节点</div>
      <div class="mt-1 text-sm text-gray-400">请先在工作流中添加开始节点</div>
    </div>

    <div v-else-if="!inputVars.length" class="py-8 text-center">
      <div class="mb-2 text-gray-400">
        <svg
          class="mx-auto h-12 w-12 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div class="system-md-regular text-gray-500">无输入参数</div>
      <div class="mt-1 text-sm text-gray-400">开始节点未配置输入字段</div>
      <button
        class="mt-4 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700"
        @click="openStartNodeConfig"
      >
        去配置 →
      </button>
    </div>

    <div v-else class="space-y-4">
      <div class="mb-2 text-sm text-gray-500">请填写以下输入参数</div>

      <NodeDebugForm
        :fields="startFields"
        :model-value="formData"
        :running="runStore.running"
        @update:model-value="handleFormUpdate"
        @execute="handleRun"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  buildWorkflowInputDefaultValue,
  useWorkflowRunStore
} from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import type { OFInputVar } from '@shared/Orchestraflow-types'
import { OFBlockEnum, OFVarType } from '@shared/Orchestraflow-types'
import NodeDebugForm, { type NodeDebugField } from '../../NodeDebug/NodeDebugForm.vue'

const runStore = useWorkflowRunStore()
const editorStore = useWorkflowEditorStore()
const uiStore = useWorkflowEditorUIStore()

const formData = reactive<Record<string, any>>({})

const startNode = computed(() =>
  editorStore.nodes.find((node) => node.data.type === OFBlockEnum.Start)
)

const inputVars = computed<OFInputVar[]>(() => {
  if (!startNode.value) return []
  return (startNode.value.data as any).input?.variables || []
})

const startFields = computed<NodeDebugField[]>(() =>
  inputVars.value.map((item) => ({
    key: item.variable,
    label: item.label || item.variable,
    type: item.type,
    required: item.required,
    placeholder: item.description || buildPlaceholder(item),
    schema: item.schema || null
  }))
)

watch(
  inputVars,
  (vars) => {
    const activeKeys = new Set(vars.map((item) => item.variable))

    Object.keys(formData).forEach((key) => {
      if (!activeKeys.has(key)) {
        delete formData[key]
      }
    })

    vars.forEach((item) => {
      if (formData[item.variable] !== undefined) return
      formData[item.variable] = buildWorkflowInputDefaultValue(item)
    })
  },
  { immediate: true }
)

watch(
  formData,
  (value) => {
    runStore.setStartInputs({ ...value })
  },
  { deep: true }
)

function buildPlaceholder(inputVar: OFInputVar): string {
  if (inputVar.type === OFVarType.Array) {
    return '请输入 JSON 数组，例如 []'
  }
  if (inputVar.type === OFVarType.Object) {
    return '请输入 JSON 对象，例如 {}'
  }
  return `请输入 ${inputVar.label || inputVar.variable}`
}

function handleFormUpdate(values: Record<string, any>) {
  Object.keys(formData).forEach((key) => {
    delete formData[key]
  })

  Object.entries(values).forEach(([key, value]) => {
    formData[key] = value
  })
}

function handleRun(values: Record<string, any>) {
  if (!editorStore.currentWorkflowId) return
  runStore.setStartInputs({ ...values })
  runStore.runWorkflow(editorStore.currentWorkflowId, { ...values })
}

function openStartNodeConfig() {
  if (startNode.value) {
    uiStore.setSelectedNodeId(startNode.value.id)
  }
}
</script>
