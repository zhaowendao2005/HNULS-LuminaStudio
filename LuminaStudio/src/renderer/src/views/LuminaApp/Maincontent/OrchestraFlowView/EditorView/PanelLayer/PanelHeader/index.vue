<template>
  <div class="of-editor-header pointer-events-auto overflow-x-auto z-20">
    <div class="flex items-center justify-between px-4 py-2 min-w-fit">
      <!-- 左对齐：自动保存状态 -->
      <div class="text-sm text-gray-600 flex-shrink-0">
        <span>自动保存</span>
        <span class="mx-1">·</span>
        <span>{{ autoSaveTime }}</span>
        <span class="mx-1">·</span>
        <span class="text-gray-500">未发布</span>
      </div>

      <!-- 右对齐:圆角 SVG 图标按钮 -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- 测试运行组合按钮（左侧运行状态+右侧更多） -->
        <div class="relative flex">
          <!-- 左侧：测试运行按钮（显示运行状态） -->
          <button
            class="relative group flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-l-md transition-colors border border-green-200 border-r-0"
            :title="isRunning ? '运行中...' : '测试运行 Alt R'"
            @click="handleRunWorkflow"
          >
            <!-- 运行中：加载图标 -->
            <svg
              v-if="isRunning"
              class="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <!-- 已完成：对勾图标 -->
            <svg
              v-else-if="isCompleted"
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <!-- 默认：播放图标 -->
            <svg
              v-else
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
              />
            </svg>
            <span class="text-sm font-medium">{{ runButtonText }}</span>
            <span v-if="!isRunning && !isCompleted" class="text-xs opacity-75">Alt R</span>
          </button>

          <!-- 右侧：更多按钮（直接打开面板） -->
          <button
            class="relative group px-2 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-r-md transition-colors border border-green-200 border-l border-green-300"
            title="查看运行面板"
            @click="openRunPanel"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
              />
            </svg>
          </button>
        </div>

        <!-- 分隔线 -->
        <div class="w-px h-6 bg-gray-300"></div>

        <!-- 测试历史按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="测试历史"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        <!-- 检查清单按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="检查清单"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <!-- 环境变量按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="环境变量"
        >
          <span class="text-xs font-medium text-gray-700">ENV</span>
        </button>

        <button
          class="relative group flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-md transition-colors border border-gray-200"
          title="复制给 AI 的可运行 OrchestraFlow workflow schema"
          @click="handleCopyAISchema"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M10 10h8a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2z"
            />
          </svg>
          <span class="text-sm font-medium">复制 AI Schema</span>
        </button>

        <!-- 系统变量按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="系统变量"
          @click="emit('open-system-variables')"
        >
          <span class="text-xs font-medium text-gray-700">X</span>
        </button>

        <!-- 发布按钮（淡绿色，带下拉箭头） -->
        <button
          class="relative group flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors border border-green-200"
          title="发布"
        >
          <span class="text-sm font-medium">发布</span>
          <svg
            class="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- 历史按钮 -->
        <button
          class="relative group w-8 h-8 bg-white hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          title="历史"
        >
          <svg
            class="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import {
  normalizeWorkflowInputs,
  useWorkflowRunStore
} from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'

const props = defineProps<{
  autoSaveTime: string
}>()

const emit = defineEmits<{
  'open-system-variables': []
}>()

const editorStore = useWorkflowEditorStore()
const runStore = useWorkflowRunStore()
const uiStore = useWorkflowEditorUIStore()

const isRunning = computed(() => runStore.isRunning)
const isCompleted = computed(() => runStore.isSucceeded || runStore.isFailed)

const runButtonText = computed(() => {
  if (isRunning.value) return '运行中...'
  if (isCompleted.value) return '已完成'
  return '测试运行'
})

function handleRunWorkflow() {
  if (!editorStore.currentWorkflowId) return

  if (isRunning.value) {
    return
  }

  if (isCompleted.value) {
    runStore.reset()
  }

  // 获取 Start 节点的输入定义
  const inputVars = runStore.getStartNodeInputs(editorStore.nodes)

  // 如果有输入定义，先校验
  if (inputVars.length > 0) {
    // 校验必填项
    const validation = runStore.validateStartInputs(inputVars)

    if (!validation.valid) {
      // 打开面板并切换到开始 Tab，显示错误
      uiStore.openWorkflowRunPanel()
      // 错误会显示在 StartTab 中
      alert('请先填写开始节点的必填参数：\n' + validation.errors.join('\n'))
      return
    }

    const normalized = normalizeWorkflowInputs(inputVars, runStore.startInputs)
    runStore.setStartInputs({ ...normalized.values })
    runStore.runWorkflow(editorStore.currentWorkflowId, normalized.values)
  } else {
    // 无需输入，直接运行
    runStore.runWorkflow(editorStore.currentWorkflowId)
  }

  // 打开结果面板
  uiStore.openWorkflowRunPanel()
}

function openRunPanel() {
  uiStore.openWorkflowRunPanel()
}

async function handleCopyAISchema() {
  const response = await window.api.orchestraflow.getAISchemaBundle()
  if (!response.success || !response.data) {
    alert(response.error || 'AI Schema 导出失败')
    return
  }

  await navigator.clipboard.writeText(response.data.bundled_markdown)
  alert('可运行的 OrchestraFlow workflow schema 已复制到剪贴板。请让 AI 直接输出最终工作流 JSON。')
}
</script>
