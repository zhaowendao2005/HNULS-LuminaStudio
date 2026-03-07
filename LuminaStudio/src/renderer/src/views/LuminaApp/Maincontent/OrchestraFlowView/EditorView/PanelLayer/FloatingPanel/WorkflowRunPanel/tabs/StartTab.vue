<template>
  <div class="of-start-tab-4a2 h-full flex flex-col">
    <!-- 无 Start 节点时提示 -->
    <div v-if="!startNode" class="text-center py-8">
      <div class="text-gray-400 mb-2">
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
      <div class="text-sm text-gray-400 mt-1">请在工作流中添加开始节点</div>
    </div>

    <!-- 有 Start 节点但无输入字段时 -->
    <div v-else-if="!inputVars || inputVars.length === 0" class="text-center py-8">
      <div class="text-gray-400 mb-2">
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
      <div class="text-sm text-gray-400 mt-1">开始节点未配置输入字段</div>
      <button
        class="mt-4 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700"
        @click="openStartNodeConfig"
      >
        去配置 →
      </button>
    </div>

    <!-- 输入表单 -->
    <div v-else class="space-y-4">
      <div class="text-sm text-gray-500 mb-4">请填写以下输入参数</div>

      <!-- 错误提示 -->
      <div v-if="errors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <div class="flex items-start gap-2">
          <svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="space-y-1">
            <div class="text-sm text-red-700 font-medium">请完善以下必填项</div>
            <ul class="text-xs text-red-600 space-y-0.5">
              <li v-for="error in errors" :key="error">{{ error }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 字段列表 -->
      <div v-for="inputVar in inputVars" :key="inputVar.variable" class="space-y-1.5 px-2">
        <label class="flex items-center gap-1 text-sm font-medium text-gray-700">
          {{ inputVar.label || inputVar.variable }}
          <span v-if="inputVar.required" class="text-red-500">*</span>
        </label>

        <!-- 文本输入 -->
        <input
          v-if="inputVar.type === 'text-input'"
          v-model="formData[inputVar.variable]"
          type="text"
          class="w-full px-6 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          :class="
            errors.some((e) => e.includes(inputVar.label || inputVar.variable))
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          "
          :placeholder="inputVar.description || `请输入${inputVar.label || inputVar.variable}`"
        />

        <!-- 文本域 -->
        <textarea
          v-else-if="inputVar.type === 'text-area'"
          v-model="formData[inputVar.variable]"
          rows="3"
          class="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          :class="
            errors.some((e) => e.includes(inputVar.label || inputVar.variable))
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          "
          :placeholder="inputVar.description || `请输入${inputVar.label || inputVar.variable}`"
        ></textarea>

        <!-- 下拉选择 -->
        <select
          v-else-if="inputVar.type === 'select'"
          v-model="formData[inputVar.variable]"
          class="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          :class="
            errors.some((e) => e.includes(inputVar.label || inputVar.variable))
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          "
        >
          <option value="">请选择</option>
          <option v-for="option in inputVar.options" :key="option" :value="option">
            {{ option }}
          </option>
        </select>

        <div
          v-else-if="inputVar.type === OFVarType.Array"
          class="space-y-2 rounded-lg border bg-white p-3"
          :class="
            errors.some((e) => e.includes(inputVar.label || inputVar.variable))
              ? 'border-red-300 bg-red-50/40'
              : 'border-gray-300'
          "
        >
          <div class="flex items-center justify-between">
            <div class="text-xs text-gray-500">列表输入</div>
            <button
              type="button"
              class="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
              @click="appendArrayItem(inputVar.variable)"
            >
              添加项
            </button>
          </div>

          <div v-if="getArrayItems(inputVar.variable).length === 0" class="text-xs text-gray-400">
            暂无列表项，点击“添加项”录入测试数据
          </div>

          <div
            v-for="(item, index) in getArrayItems(inputVar.variable)"
            :key="`${inputVar.variable}-${index}`"
            class="flex items-center gap-2"
          >
            <div class="w-8 shrink-0 text-center text-xs text-gray-400">
              {{ index + 1 }}
            </div>
            <input
              :value="item"
              type="text"
              class="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              :placeholder="inputVar.description || '请输入列表项内容'"
              @input="
                updateArrayItem(
                  inputVar.variable,
                  index,
                  ($event.target as HTMLInputElement).value
                )
              "
            />
            <button
              type="button"
              class="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              @click="removeArrayItem(inputVar.variable, index)"
            >
              删除
            </button>
          </div>
        </div>

        <!-- 默认：文本输入 -->
        <input
          v-else
          v-model="formData[inputVar.variable]"
          type="text"
          class="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          :class="
            errors.some((e) => e.includes(inputVar.label || inputVar.variable))
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          "
          :placeholder="inputVar.description || `请输入${inputVar.label || inputVar.variable}`"
        />

        <div v-if="inputVar.description" class="text-xs text-gray-400">
          {{ inputVar.description }}
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="pt-4 border-t border-gray-100">
        <button
          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors border border-green-200 font-medium"
          @click="handleRun"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
            />
          </svg>
          测试运行
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useWorkflowRunStore } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import { normalizeWorkflowInputs } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import type { OFInputVar } from '@shared/Orchestraflow-types'
import { OFBlockEnum, OFVarType } from '@shared/Orchestraflow-types'

const runStore = useWorkflowRunStore()
const editorStore = useWorkflowEditorStore()
const uiStore = useWorkflowEditorUIStore()

const errors = ref<string[]>([])

// 表单数据
const formData = reactive<Record<string, any>>({})

// 获取 Start 节点
const startNode = computed(() => {
  return editorStore.nodes.find((n) => n.data.type === OFBlockEnum.Start)
})

// 获取输入变量定义
const inputVars = computed<OFInputVar[]>(() => {
  if (!startNode.value) return []
  return (startNode.value.data as any).input?.variables || []
})

// 同步 formData 到 store（供 Header 点击测试运行时使用）
watch(
  formData,
  (newData) => {
    runStore.setStartInputs({ ...newData })
  },
  { deep: true }
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
      if (item.type === OFVarType.Array) {
        formData[item.variable] = Array.isArray(item.default) ? [...item.default] : []
        return
      }
      formData[item.variable] = typeof item.default === 'string' ? item.default : ''
    })
  },
  { immediate: true }
)

// 校验：直接使用当前 formData，避免与 store 同步时机问题
function validate(): boolean {
  const normalized = normalizeWorkflowInputs(inputVars.value, formData)
  errors.value = normalized.errors
  return normalized.errors.length === 0
}

// 运行工作流
function handleRun() {
  if (!editorStore.currentWorkflowId) return

  runStore.setStartInputs({ ...formData })

  if (!validate()) {
    return
  }

  const normalized = normalizeWorkflowInputs(inputVars.value, formData)
  runStore.setStartInputs({ ...normalized.values })
  runStore.runWorkflow(editorStore.currentWorkflowId, { ...normalized.values })
}

// 打开开始节点配置
function openStartNodeConfig() {
  if (startNode.value) {
    uiStore.setSelectedNodeId(startNode.value.id)
  }
}

function getArrayItems(variable: string): string[] {
  const value = formData[variable]
  return Array.isArray(value) ? value : []
}

function setArrayItems(variable: string, items: string[]) {
  formData[variable] = items
}

function appendArrayItem(variable: string) {
  setArrayItems(variable, [...getArrayItems(variable), ''])
}

function updateArrayItem(variable: string, index: number, value: string) {
  const items = [...getArrayItems(variable)]
  items[index] = value
  setArrayItems(variable, items)
}

function removeArrayItem(variable: string, index: number) {
  const items = [...getArrayItems(variable)]
  items.splice(index, 1)
  setArrayItems(variable, items)
}
</script>
