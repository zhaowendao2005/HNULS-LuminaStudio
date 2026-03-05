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

      <!-- 折叠面板列表 -->
      <div class="space-y-2">
        <div
          v-for="(tracing, index) in runStore.tracingList"
          :key="tracing.nodeId"
          class="border border-gray-200 rounded-lg overflow-hidden"
        >
          <!-- 折叠标题 -->
          <button
            class="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            @click="toggleExpand(tracing.nodeId)"
          >
            <div class="flex items-center gap-2">
              <!-- 展开/收起图标 -->
              <svg
                class="w-4 h-4 text-gray-400 transition-transform"
                :class="{ 'rotate-90': expandedNodes.has(tracing.nodeId) }"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
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
              <span
                class="px-2 py-0.5 text-xs rounded"
                :class="getStatusClass(tracing.status)"
              >
                {{ getStatusText(tracing.status) }}
              </span>
            </div>
          </button>

          <!-- 折叠内容 -->
          <div v-show="expandedNodes.has(tracing.nodeId)" class="border-t border-gray-200">
            <!-- 原始数据 -->
            <div class="p-3 bg-white">
              <div class="text-xs font-medium text-gray-500 mb-2">原始数据 (Raw Data)</div>
              <div class="bg-gray-900 rounded-lg p-3 overflow-auto max-h-80">
                <pre class="text-xs text-green-400 whitespace-pre-wrap">{{ formatRawData(tracing) }}</pre>
              </div>
            </div>

            <!-- 错误信息 -->
            <div v-if="tracing.error" class="p-3 bg-red-50 border-t border-gray-200">
              <div class="text-xs font-medium text-red-600 mb-1">错误信息</div>
              <div class="text-xs text-red-700">{{ tracing.error }}</div>
            </div>

            <!-- 输入输出详情 -->
            <div class="grid grid-cols-2 border-t border-gray-200">
              <div class="p-3 border-r border-gray-200">
                <div class="text-xs font-medium text-gray-500 mb-1">输入 (Inputs)</div>
                <pre class="text-xs text-gray-600 whitespace-pre-wrap">{{ formatJson(tracing.inputs) }}</pre>
              </div>
              <div class="p-3">
                <div class="text-xs font-medium text-gray-500 mb-1">输出 (Outputs)</div>
                <pre class="text-xs text-gray-600 whitespace-pre-wrap">{{ formatJson(tracing.outputs) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWorkflowRunStore } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import { OFBlockEnum, OFNodeRunningStatus } from '@shared/Orchestraflow-types'

const runStore = useWorkflowRunStore()

// 展开状态集合
const expandedNodes = ref<Set<string>>(new Set())

// 切换展开/收起
function toggleExpand(nodeId: string) {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    expandedNodes.value.add(nodeId)
  }
}

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

// 获取节点图标
function getNodeIcon(nodeType: string): string {
  switch (nodeType) {
    case OFBlockEnum.Start:
      return 'S'
    case OFBlockEnum.Llm:
      return 'L'
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
    case OFBlockEnum.Llm:
      return 'bg-purple-500'
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
    case OFBlockEnum.Llm:
      return 'LLM 节点'
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
