<template>
  <div class="of-detail-tab-8b1 h-full flex flex-col">
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
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div class="system-md-regular text-gray-500">暂无运行结果</div>
      <div class="text-sm text-gray-400 mt-1">运行工作流后查看详情</div>
    </div>

    <!-- 有结果时展示 -->
    <div v-else class="space-y-4">
      <!-- 运行状态 -->
      <div class="flex items-center justify-between">
        <div class="text-sm font-medium text-gray-700">运行详情</div>
        <div class="text-xs text-gray-400">
          {{ runStore.result?.tracing.length }} 个节点
        </div>
      </div>

      <!-- 输入输出面板 -->
      <div class="grid grid-cols-2 gap-4">
        <!-- 输入列 -->
        <div class="flex flex-col">
          <div class="text-xs font-medium text-gray-500 uppercase mb-2">输入 (Inputs)</div>
          <div class="flex-1 bg-gray-50 rounded-lg p-3 overflow-auto">
            <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ inputsJson }}</pre>
          </div>
        </div>

        <!-- 输出列 -->
        <div class="flex flex-col">
          <div class="text-xs font-medium text-gray-500 uppercase mb-2">输出 (Outputs)</div>
          <div class="flex-1 bg-gray-50 rounded-lg p-3 overflow-auto">
            <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ outputsJson }}</pre>
          </div>
        </div>
      </div>

      <!-- 每个节点的详情 -->
      <div class="space-y-3">
        <div class="text-xs font-medium text-gray-500 uppercase">节点详情</div>
        <div
          v-for="tracing in runStore.tracingList"
          :key="tracing.nodeId"
          class="border border-gray-200 rounded-lg overflow-hidden"
        >
          <!-- 节点标题 -->
          <div class="flex items-center justify-between px-3 py-2 bg-gray-50">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-700">{{ getNodeTitle(tracing) }}</span>
              <span class="text-xs text-gray-400">{{ tracing.nodeId }}</span>
            </div>
            <span
              class="px-2 py-0.5 text-xs rounded"
              :class="getStatusClass(tracing.status)"
            >
              {{ getStatusText(tracing.status) }}
            </span>
          </div>

          <!-- 节点输入输出 -->
          <div class="grid grid-cols-2 gap-px bg-gray-200">
            <div class="bg-white p-2">
              <div class="text-xs text-gray-400 mb-1">输入</div>
              <pre class="text-xs text-gray-600 whitespace-pre-wrap">{{ formatJson(tracing.inputs) }}</pre>
            </div>
            <div class="bg-white p-2">
              <div class="text-xs text-gray-400 mb-1">输出</div>
              <pre class="text-xs text-gray-600 whitespace-pre-wrap">{{ formatJson(tracing.outputs) }}</pre>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="tracing.error" class="px-3 py-2 bg-red-50 border-t border-gray-200">
            <div class="text-xs text-red-600">错误: {{ tracing.error }}</div>
          </div>

          <!-- 执行时间 -->
          <div v-if="tracing.elapsed_time" class="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
            耗时: {{ tracing.elapsed_time }}ms
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWorkflowRunStore } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import { OFBlockEnum, OFNodeRunningStatus } from '@shared/Orchestraflow-types'

const runStore = useWorkflowRunStore()

// 收集所有输入
const inputsJson = computed(() => {
  const allInputs: Record<string, any> = {}

  for (const tracing of runStore.tracingList) {
    if (tracing.inputs) {
      Object.assign(allInputs, tracing.inputs)
    }
  }

  return formatJson(allInputs)
})

// 收集所有输出
const outputsJson = computed(() => {
  const allOutputs: Record<string, any> = {}

  for (const tracing of runStore.tracingList) {
    if (tracing.outputs) {
      Object.assign(allOutputs, tracing.outputs)
    }
  }

  return formatJson(allOutputs)
})

function formatJson(obj: any): string {
  if (!obj) return '(无)'
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function getNodeTitle(tracing: any): string {
  switch (tracing.nodeType) {
    case OFBlockEnum.Start:
      return '开始'
    case OFBlockEnum.Llm:
      return 'LLM'
    case OFBlockEnum.End:
      return '结束'
    default:
      return tracing.nodeType
  }
}

function getStatusClass(status: OFNodeRunningStatus): string {
  switch (status) {
    case OFNodeRunningStatus.Succeeded:
      return 'bg-green-100 text-green-700'
    case OFNodeRunningStatus.Failed:
      return 'bg-red-100 text-red-700'
    case OFNodeRunningStatus.Running:
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

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
