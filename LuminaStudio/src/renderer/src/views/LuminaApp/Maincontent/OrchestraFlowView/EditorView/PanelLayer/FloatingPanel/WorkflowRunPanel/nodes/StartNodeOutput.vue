<template>
  <div class="of-node-output of-start-node-output pl-6">
    <!-- 节点标题 -->
    <div class="flex items-center gap-2 mb-3">
      <div class="flex items-center justify-center w-5 h-5 rounded bg-blue-500 text-white shrink-0">
        <svg
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          fill="currentColor"
        >
          <path d="M12 4V20M4 12H20" stroke="currentColor" stroke-width="2" fill="none" />
        </svg>
      </div>
      <div class="system-md-semibold text-gray-900">开始</div>
      <div v-if="tracing.status" class="ml-auto">
        <span
          class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
          :class="getStatusClass(tracing.status)"
        >
          {{ getStatusText(tracing.status) }}
        </span>
      </div>
    </div>

    <!-- 输入字段列表 -->
    <div v-if="inputs && Object.keys(inputs).length > 0" class="space-y-2">
      <div
        v-for="(value, key) in inputs"
        :key="key"
        class="rounded-lg border border-gray-200 bg-gray-50 p-2"
      >
        <div class="flex items-center gap-1.5 mb-1">
          <span class="text-xs font-medium text-gray-500 uppercase">{{ key }}</span>
        </div>
        <div class="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {{ value || '(空)' }}
        </div>
      </div>
    </div>
    <div v-else class="text-sm text-gray-400 text-center py-2">无输入字段</div>

    <!-- 执行信息 -->
    <div v-if="tracing.elapsed_time" class="mt-2 text-xs text-gray-400">
      耗时: {{ tracing.elapsed_time.toFixed(2) }}s
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OFNodeTracing } from '@shared/Orchestraflow-types'
import { OFNodeRunningStatus } from '@shared/Orchestraflow-types'

interface Props {
  tracing: OFNodeTracing
}

const props = defineProps<Props>()

const inputs = computed(() => props.tracing.inputs || {})

function getStatusClass(status: OFNodeRunningStatus): string {
  switch (status) {
    case OFNodeRunningStatus.Succeeded:
      return 'bg-green-100 text-green-800'
    case OFNodeRunningStatus.Running:
      return 'bg-blue-100 text-blue-800'
    case OFNodeRunningStatus.Failed:
      return 'bg-red-100 text-red-800'
    case OFNodeRunningStatus.Skipped:
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getStatusText(status: OFNodeRunningStatus): string {
  switch (status) {
    case OFNodeRunningStatus.Succeeded:
      return '成功'
    case OFNodeRunningStatus.Running:
      return '运行中'
    case OFNodeRunningStatus.Failed:
      return '失败'
    case OFNodeRunningStatus.Skipped:
      return '跳过'
    default:
      return '未开始'
  }
}
</script>
