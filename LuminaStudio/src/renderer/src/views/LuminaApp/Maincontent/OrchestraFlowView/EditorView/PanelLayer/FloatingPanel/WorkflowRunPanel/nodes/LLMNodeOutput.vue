<template>
  <div class="of-node-output of-llm-node-output">
    <!-- 节点标题 -->
    <div class="flex items-center gap-2 mb-3">
      <div class="flex items-center justify-center w-5 h-5 rounded bg-indigo-500 text-white shrink-0">
        <svg
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M5.83333 2.40625C5.04971 2.40625 4.39011 2.94431 4.20689 3.67206C4.13982 3.93846 3.91391 4.1349 3.64078 4.16432C2.94692 4.23906 2.40625 4.82766 2.40625 5.54167C2.40625 5.92943 2.56471 6.27904 2.82212 6.53129C2.94807 6.65472 3.01905 6.82365 3.01905 7C3.01905 7.17635 2.94807 7.34528 2.82212 7.46871C2.56471 7.72096 2.40625 8.07057 2.40625 8.45833C2.40625 9.03652 2.76061 9.53347 3.26651 9.74092C3.45247 9.81717 3.59324 9.97444 3.64849 10.1677C3.8841 10.9917 4.64342 11.5938 5.54167 11.5938C5.82802 11.5938 6.09916 11.533 6.34375 11.4237V9.91667C6.34375 9.31258 5.85409 8.82292 5.25 8.82292C4.88756 8.82292 4.59375 8.5291 4.59375 8.16667C4.59375 7.80423 4.88756 7.51042 5.25 7.51042C5.64385 7.51042 6.0156 7.60503 6.34375 7.77278V2.48514C6.18319 2.43393 6.01183 2.40625 5.83333 2.40625ZM7.65625 2.48514V4.08333C7.65625 4.6874 8.14592 5.17708 8.75 5.17708C9.11244 5.17708 9.40625 5.4709 9.40625 5.83333C9.40625 6.19577 9.11244 6.48958 8.75 6.48958C8.35615 6.48958 7.9844 6.39496 7.65625 6.22722V11.4237C7.90087 11.533 8.17199 11.5938 8.45833 11.5938C9.35657 11.5938 10.1159 10.9917 10.3515 10.1677C10.4068 9.97444 10.5475 9.81717 10.7335 9.74092C11.2394 9.53347 11.5938 9.03652 11.5938 8.45833C11.5938 8.07056 11.4353 7.72096 11.1779 7.46871C11.0519 7.34528 10.981 7.17635 10.981 7C10.981 6.82365 11.0519 6.65472 11.1779 6.53129C11.4353 6.27904 11.5938 5.92944 11.5938 5.54167C11.5938 4.82766 11.0531 4.23906 10.3592 4.16432C10.0861 4.1349 9.86022 3.93847 9.79315 3.67208C9.6099 2.94432 8.95027 2.40625 8.16667 2.40625C7.98817 2.40625 7.81681 2.43393 7.65625 2.48514ZM7.00001 12.565C6.56031 12.7835 6.06472 12.9062 5.54167 12.9062C4.14996 12.9062 2.96198 12.0403 2.48457 10.8188C1.65595 10.3591 1.09375 9.47501 1.09375 8.45833C1.09375 7.9213 1.2511 7.42042 1.52161 7C1.2511 6.57958 1.09375 6.0787 1.09375 5.54167C1.09375 4.30153 1.93005 3.25742 3.06973 2.94157C3.51828 1.85715 4.586 1.09375 5.83333 1.09375C6.24643 1.09375 6.64104 1.17788 7 1.33013C7.35896 1.17788 7.75357 1.09375 8.16667 1.09375C9.41399 1.09375 10.4817 1.85716 10.9303 2.94157C12.0699 3.25742 12.9062 4.30153 12.9062 5.54167C12.9062 6.07869 12.7489 6.57958 12.4784 7C12.7489 7.42043 12.9062 7.92131 12.9062 8.45833C12.9062 9.47502 12.344 10.3591 11.5154 10.8188C11.038 12.0403 9.85003 12.9062 8.45833 12.9062C7.93526 12.9062 7.4397 12.7834 7.00001 12.565Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div class="system-md-semibold text-gray-900">LLM</div>
      <div v-if="tracing.status" class="ml-auto">
        <span
          class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
          :class="getStatusClass(tracing.status)"
        >
          {{ getStatusText(tracing.status) }}
        </span>
      </div>
    </div>

    <!-- 模型信息 -->
    <div v-if="modelInfo" class="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
      <div class="text-xs font-medium text-gray-500 uppercase mb-1">模型</div>
      <div class="text-sm text-gray-700">{{ modelInfo.provider }} / {{ modelInfo.name }}</div>
    </div>

    <!-- Prompt 模板 -->
    <div v-if="promptList && promptList.length > 0" class="mb-3 space-y-2">
      <div class="text-xs font-medium text-gray-500 uppercase">Prompt</div>
      <div
        v-for="(prompt, index) in promptList"
        :key="index"
        class="rounded-lg border border-gray-200 bg-gray-50 p-2"
      >
        <div class="flex items-center gap-1.5 mb-1">
          <span
            class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
            :class="getRoleClass(prompt.role)"
          >
            {{ prompt.role.toUpperCase() }}
          </span>
        </div>
        <div class="text-sm text-gray-700 whitespace-pre-wrap break-words">{{ prompt.text || '(空)' }}</div>
      </div>
    </div>

    <!-- 输出区域 -->
    <div v-if="tracing.status === 'running'" class="mb-3">
      <div class="text-xs font-medium text-gray-500 uppercase mb-2">输出 (流式)</div>
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div class="text-sm text-gray-700 whitespace-pre-wrap break-words">{{ streamedOutput }}</div>
        <div class="mt-2 flex items-center gap-2">
          <div class="animate-pulse h-2 w-2 rounded-full bg-blue-500"></div>
          <span class="text-xs text-blue-600">流式输出中...</span>
        </div>
      </div>
    </div>

    <div v-else-if="tracing.outputs?.text" class="mb-3">
      <div class="text-xs font-medium text-gray-500 uppercase mb-2">输出</div>
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div class="text-sm text-gray-700 whitespace-pre-wrap break-words">{{ tracing.outputs.text }}</div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="tracing.error" class="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <div class="text-xs font-medium text-red-600 uppercase mb-1">错误</div>
      <div class="text-sm text-red-700 whitespace-pre-wrap break-words">{{ tracing.error }}</div>
    </div>

    <!-- 执行信息 -->
    <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
      <span v-if="tracing.elapsed_time">耗时: {{ tracing.elapsed_time.toFixed(2) }}s</span>
      <span v-if="tracing.tokens">Tokens: {{ tracing.tokens }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { OFNodeTracing } from '@shared/Orchestraflow-types'
import { OFNodeRunningStatus } from '@shared/Orchestraflow-types'
import { createStreamingChunks } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.mock'

interface Props {
  tracing: OFNodeTracing
}

const props = defineProps<Props>()

// 模型信息
const modelInfo = computed(() => {
  const inputs = props.tracing.inputs as any
  return inputs?.model || null
})

// Prompt 列表
const promptList = computed(() => {
  const inputs = props.tracing.inputs as any
  return inputs?.prompt || []
})

// 流式输出模拟
const streamedOutput = ref('')

onMounted(() => {
  if (props.tracing.status === OFNodeRunningStatus.Running) {
    simulateStreaming()
  }
})

watch(
  () => props.tracing.status,
  (newStatus) => {
    if (newStatus === OFNodeRunningStatus.Running) {
      streamedOutput.value = ''
      simulateStreaming()
    }
  }
)

function simulateStreaming() {
  const chunks = createStreamingChunks()
  let index = 0

  const interval = setInterval(() => {
    if (index < chunks.length) {
      streamedOutput.value += chunks[index]
      index++
    } else {
      clearInterval(interval)
    }
  }, 100)
}

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

function getRoleClass(role: string): string {
  switch (role) {
    case 'system':
      return 'bg-purple-100 text-purple-700'
    case 'user':
      return 'bg-blue-100 text-blue-700'
    case 'assistant':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
</script>
