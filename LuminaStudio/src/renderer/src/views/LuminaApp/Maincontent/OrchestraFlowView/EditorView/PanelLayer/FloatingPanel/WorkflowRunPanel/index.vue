<template>
  <FloatingPanel
    :visible="visible"
    title="运行测试"
    description="填写输入参数并测试工作流"
    @close="handleClose"
  >
    <!-- Tab 切换头部 -->
    <div class="flex border-b border-gray-200 mb-4 -mt-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="
          activeTab === tab.key
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab 内容区 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 开始 Tab: 输入表单 -->
      <div v-show="activeTab === 'start'" class="space-y-4">
        <StartTab />
      </div>

      <!-- 结果 Tab: 运行结果 -->
      <div v-show="activeTab === 'result'" class="space-y-4">
        <!-- 运行状态摘要 -->
        <div v-if="runStore.hasResult">
          <div class="flex items-center justify-between rounded-lg px-3 py-2" :class="statusClass">
            <div class="flex items-center gap-2">
              <span class="system-md-semibold">{{ statusText }}</span>
              <span class="text-sm opacity-80">
                {{ runStore.result?.elapsed_time?.toFixed(2) }}s
              </span>
            </div>
            <div v-if="runStore.result?.total_tokens" class="text-sm">
              {{ runStore.result.total_tokens }} tokens
            </div>
          </div>
        </div>

        <!-- 节点追踪列表 -->
        <div v-if="runStore.tracingList.length > 0" class="space-y-4">
          <div
            v-for="(tracing, index) in runStore.tracingList"
            :key="tracing.nodeId"
            class="relative pl-4"
          >
            <!-- 连接线 -->
            <div
              v-if="index < runStore.tracingList.length - 1"
              class="absolute left-[9px] top-6 bottom-[-16px] w-0.5 bg-gray-200"
            ></div>

            <!-- 节点输出组件 -->
            <StartNodeOutput v-if="tracing.nodeType === OFBlockEnum.Start" :tracing="tracing" />
            <LLMNodeOutput v-else-if="tracing.nodeType === OFBlockEnum.Llm" :tracing="tracing" />
            <EndNodeOutput v-else-if="tracing.nodeType === OFBlockEnum.End" :tracing="tracing" />
          </div>
        </div>

        <!-- 无结果状态 -->
        <div v-else-if="!runStore.isRunning" class="text-center py-8">
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
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div class="system-md-regular text-gray-500">暂无运行结果</div>
          <div class="text-sm text-gray-400 mt-1">请在"开始"标签页填写参数后运行</div>
        </div>

        <!-- 运行中状态 -->
        <div v-else class="text-center py-8">
          <div class="flex items-center justify-center gap-2 mb-2">
            <div
              class="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"
            ></div>
            <span class="system-md-regular text-indigo-600">运行中...</span>
          </div>
          <div class="text-sm text-gray-400">请稍候</div>
        </div>

        <!-- 底部操作 -->
        <div v-if="runStore.hasResult" class="mt-4 pt-4 border-t border-gray-100">
          <button
            class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors border border-green-200"
            @click="handleRunAgain"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
              />
            </svg>
            <span class="text-sm font-medium">重新运行</span>
          </button>
        </div>
      </div>

      <!-- 详情 Tab: 输入输出 JSON -->
      <div v-show="activeTab === 'detail'" class="space-y-4">
        <DetailTab />
      </div>

      <!-- 追踪 Tab: 折叠面板 -->
      <div v-show="activeTab === 'trace'" class="space-y-4">
        <TracingTab />
      </div>
    </div>
  </FloatingPanel>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import FloatingPanel from '../index.vue'
import StartNodeOutput from './nodes/StartNodeOutput.vue'
import LLMNodeOutput from './nodes/LLMNodeOutput.vue'
import EndNodeOutput from './nodes/EndNodeOutput.vue'
import StartTab from './tabs/StartTab.vue'
import DetailTab from './tabs/DetailTab.vue'
import TracingTab from './tabs/TracingTab.vue'
import { useWorkflowRunStore } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { OFWorkflowRunningStatus, OFBlockEnum } from '@shared/Orchestraflow-types'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const runStore = useWorkflowRunStore()
const editorStore = useWorkflowEditorStore()

// Tab 配置
const tabs = [
  { key: 'start', label: '开始' },
  { key: 'result', label: '结果' },
  { key: 'detail', label: '详情' },
  { key: 'trace', label: '追踪' }
] as const

type TabKey = (typeof tabs)[number]['key']

const activeTab = ref<TabKey>('start')

// 监听运行状态，自动切换到结果 Tab
watch(
  () => runStore.isRunning,
  (isRunning) => {
    if (isRunning) {
      activeTab.value = 'result'
    }
  }
)

// 监听结果返回，切换到结果 Tab
watch(
  () => runStore.hasResult,
  (hasResult) => {
    if (hasResult && !runStore.isRunning) {
      activeTab.value = 'result'
    }
  }
)

const statusClass = computed(() => {
  switch (runStore.status) {
    case OFWorkflowRunningStatus.Succeeded:
      return 'bg-green-50 text-green-700 border border-green-200'
    case OFWorkflowRunningStatus.Failed:
      return 'bg-red-50 text-red-700 border border-red-200'
    case OFWorkflowRunningStatus.Running:
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200'
  }
})

const statusText = computed(() => {
  switch (runStore.status) {
    case OFWorkflowRunningStatus.Succeeded:
      return '运行成功'
    case OFWorkflowRunningStatus.Failed:
      return '运行失败'
    case OFWorkflowRunningStatus.Running:
      return '运行中'
    case OFWorkflowRunningStatus.Stopped:
      return '已停止'
    default:
      return '未运行'
  }
})

function handleClose(): void {
  emit('close')
}

function handleRunAgain(): void {
  if (editorStore.currentWorkflowId) {
    activeTab.value = 'start'
    runStore.runWorkflow(editorStore.currentWorkflowId, runStore.startInputs)
  }
}
</script>
