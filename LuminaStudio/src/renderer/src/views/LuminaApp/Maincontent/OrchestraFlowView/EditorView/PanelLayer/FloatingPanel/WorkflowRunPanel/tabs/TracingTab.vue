<template>
  <div class="of-tracing-tab-3c7 h-full flex flex-col">
    <!-- 无结果时提示 -->
    <div v-if="!runStore.hasResult" class="text-center py-8">
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      </div>
      <div class="system-md-regular text-gray-500">暂无运行追踪</div>
      <div class="text-sm text-gray-400 mt-1">运行工作流后查看追踪</div>
    </div>

    <!-- 有结果时展示 -->
    <div v-else class="space-y-3">
      <!-- 概览 -->
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">执行追踪</span>
        <span class="text-gray-400">{{ runStore.tracingList.length }} 个节点</span>
      </div>

      <!-- 追踪列表 -->
      <div class="space-y-2">
        <div
          v-for="tracing in runStore.tracingList"
          :key="tracing.nodeId"
          class="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div class="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 text-left">
            <div class="flex items-center gap-2">
              <!-- 节点图标 -->
              <div
                class="flex items-center justify-center w-5 h-5 rounded text-white text-xs"
                :class="getNodeIconClass(tracing.nodeType)"
              >
                {{ getNodeIcon(tracing.nodeType) }}
              </div>
              <!-- 节点名称 -->
              <span class="text-sm font-medium text-gray-700">{{ getNodeTitle(tracing) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <!-- 耗时 -->
              <span v-if="tracing.elapsed_time" class="text-xs text-gray-400">
                {{ tracing.elapsed_time }}ms
              </span>
              <!-- 状态 -->
              <span class="px-2 py-0.5 text-xs rounded" :class="getStatusClass(tracing.status)">
                {{ getStatusText(tracing.status) }}
              </span>
            </div>
          </div>

          <div class="border-t border-gray-200 p-3 bg-white space-y-2">
            <div class="flex items-center justify-between rounded-md bg-gray-50 px-2 py-2">
              <div class="text-xs text-gray-400 tracking-widest select-none">Raw ······</div>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                title="查看 Raw 详情"
                @click="openJsonDialog(`${getNodeTitle(tracing)} Raw`, formatRawData(tracing))"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>

            <div v-if="tracing.error" class="p-3 bg-red-50 border-t border-gray-200">
              <div class="text-xs font-medium text-red-600 mb-1">错误信息</div>
              <div class="text-xs text-red-700">{{ tracing.error }}</div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-md bg-gray-50 px-2 py-2">
                <div class="flex items-center justify-between">
                  <div class="text-xs text-gray-400 tracking-widest select-none">Input ······</div>
                  <button
                    class="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    title="查看输入详情"
                    @click="
                      openJsonDialog(`${getNodeTitle(tracing)} 输入`, formatJson(tracing.inputs))
                    "
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="rounded-md bg-gray-50 px-2 py-2">
                <div class="flex items-center justify-between">
                  <div class="text-xs text-gray-400 tracking-widest select-none">Output ······</div>
                  <button
                    class="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    title="查看输出详情"
                    @click="
                      openJsonDialog(`${getNodeTitle(tracing)} 输出`, formatJson(tracing.outputs))
                    "
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CenteredDialog v-model="dialogVisible" :title="dialogTitle">
      <pre class="text-xs text-gray-700 whitespace-pre-wrap break-all">{{ dialogContent }}</pre>
    </CenteredDialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWorkflowRunStore } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import { OFBlockEnum, OFNodeRunningStatus } from '@shared/Orchestraflow-types'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'

const runStore = useWorkflowRunStore()
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogContent = ref('')

// 格式化 JSON
function formatJson(obj: any): string {
  if (!obj) return '(无)'
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

// 格式化原始数据
function formatRawData(tracing: any): string {
  try {
    return JSON.stringify(tracing, null, 2)
  } catch {
    return String(tracing)
  }
}

function openJsonDialog(title: string, content: string): void {
  dialogTitle.value = title
  dialogContent.value = content
  dialogVisible.value = true
}

// 获取节点图标
function getNodeIcon(nodeType: string): string {
  switch (nodeType) {
    case OFBlockEnum.Start:
      return 'S'
    case OFBlockEnum.LLM:
      return 'L'
    case OFBlockEnum.Iteration:
      return 'R'
    case OFBlockEnum.IfElse:
      return 'I'
    case OFBlockEnum.End:
      return 'E'
    default:
      return '?'
  }
}

// 获取节点图标样式
function getNodeIconClass(nodeType: string): string {
  switch (nodeType) {
    case OFBlockEnum.Start:
      return 'bg-blue-500'
    case OFBlockEnum.LLM:
      return 'bg-purple-500'
    case OFBlockEnum.Iteration:
      return 'bg-cyan-500'
    case OFBlockEnum.IfElse:
      return 'bg-cyan-500'
    case OFBlockEnum.End:
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

// 获取节点标题
function getNodeTitle(tracing: any): string {
  switch (tracing.nodeType) {
    case OFBlockEnum.Start:
      return '开始节点'
    case OFBlockEnum.LLM:
      return 'LLM 节点'
    case OFBlockEnum.Iteration:
      return '迭代节点'
    case OFBlockEnum.IfElse:
      return '条件分支节点'
    case OFBlockEnum.End:
      return '结束节点'
    default:
      return tracing.nodeType
  }
}

// 获取状态样式
function getStatusClass(status: OFNodeRunningStatus): string {
  switch (status) {
    case OFNodeRunningStatus.Succeeded:
      return 'bg-green-100 text-green-700'
    case OFNodeRunningStatus.Failed:
      return 'bg-red-100 text-red-700'
    case OFNodeRunningStatus.Running:
      return 'bg-blue-100 text-blue-700'
    case OFNodeRunningStatus.Skipped:
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

// 获取状态文本
function getStatusText(status: OFNodeRunningStatus): string {
  switch (status) {
    case OFNodeRunningStatus.Succeeded:
      return '成功'
    case OFNodeRunningStatus.Failed:
      return '失败'
    case OFNodeRunningStatus.Running:
      return '运行中'
    case OFNodeRunningStatus.Skipped:
      return '跳过'
    default:
      return '未开始'
  }
}
</script>
