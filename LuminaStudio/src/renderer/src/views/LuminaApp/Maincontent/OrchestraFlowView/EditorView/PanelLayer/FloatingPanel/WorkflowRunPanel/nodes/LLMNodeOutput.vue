<template>
  <div class="of-node-output">
    <div class="mb-3 flex items-center gap-2">
      <div class="flex h-5 w-5 items-center justify-center rounded bg-indigo-500 text-white">
        <svg viewBox="0 0 14 14" class="h-3 w-3" fill="none">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M5.83333 2.40625C5.04971 2.40625 4.39011 2.94431 4.20689 3.67206C4.13982 3.93846 3.91391 4.1349 3.64078 4.16432C2.94692 4.23906 2.40625 4.82766 2.40625 5.54167C2.40625 5.92943 2.56471 6.27904 2.82212 6.53129C2.94807 6.65472 3.01905 6.82365 3.01905 7C3.01905 7.17635 2.94807 7.34528 2.82212 7.46871C2.56471 7.72096 2.40625 8.07057 2.40625 8.45833C2.40625 9.03652 2.76061 9.53347 3.26651 9.74092C3.45247 9.81717 3.59324 9.97444 3.64849 10.1677C3.8841 10.9917 4.64342 11.5938 5.54167 11.5938C5.82802 11.5938 6.09916 11.533 6.34375 11.4237V9.91667C6.34375 9.31258 5.85409 8.82292 5.25 8.82292C4.88756 8.82292 4.59375 8.5291 4.59375 8.16667C4.59375 7.80423 4.88756 7.51042 5.25 7.51042C5.64385 7.51042 6.0156 7.60503 6.34375 7.77278V2.48514C6.18319 2.43393 6.01183 2.40625 5.83333 2.40625Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div class="system-md-semibold text-gray-900">LLM</div>
      <div v-if="tracing.status" class="ml-auto">
        <span class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium" :class="statusClass">
          {{ statusText }}
        </span>
      </div>
    </div>

    <div v-if="tracing.status === OFNodeRunningStatus.Running" class="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div class="text-xs font-medium uppercase text-blue-600">输出 (流式)</div>
      <div class="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{{ streamedOutput }}</div>
    </div>

    <div v-else-if="tracing.outputs?.llmoutput" class="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div class="text-xs font-medium uppercase text-gray-500">文本输出</div>
      <div class="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">
        {{ tracing.outputs.llmoutput }}
      </div>
    </div>

    <div v-if="tracing.outputs?.structured_output" class="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div class="text-xs font-medium uppercase text-gray-500">结构化输出</div>
      <pre class="mt-2 whitespace-pre-wrap break-all text-sm text-gray-700">{{ prettyStructured }}</pre>
    </div>

    <div v-if="tracing.error" class="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <div class="text-xs font-medium uppercase text-red-600">错误</div>
      <div class="mt-1 whitespace-pre-wrap break-words text-sm text-red-700">{{ tracing.error }}</div>
    </div>

    <div class="mt-2 text-xs text-gray-400">
      <span v-if="tracing.elapsed_time">耗时: {{ tracing.elapsed_time }}ms</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { OFNodeTracing } from '@shared/Orchestraflow-types'
import { OFNodeRunningStatus } from '@shared/Orchestraflow-types'
import { createStreamingChunks } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.mock'

const props = defineProps<{
  tracing: OFNodeTracing
}>()

const streamedOutput = ref('')
const prettyStructured = computed(() =>
  JSON.stringify(props.tracing.outputs?.structured_output || {}, null, 2)
)

function simulateStreaming() {
  streamedOutput.value = ''
  const chunks = createStreamingChunks()
  let index = 0
  const timer = setInterval(() => {
    if (index >= chunks.length) {
      clearInterval(timer)
      return
    }
    streamedOutput.value += chunks[index]
    index += 1
  }, 100)
}

const statusText = computed(() => {
  switch (props.tracing.status) {
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
})

const statusClass = computed(() => {
  switch (props.tracing.status) {
    case OFNodeRunningStatus.Succeeded:
      return 'bg-green-100 text-green-700'
    case OFNodeRunningStatus.Failed:
      return 'bg-red-100 text-red-700'
    case OFNodeRunningStatus.Running:
      return 'bg-blue-100 text-blue-700'
    case OFNodeRunningStatus.Skipped:
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
})

watch(
  () => props.tracing.status,
  (status) => {
    if (status === OFNodeRunningStatus.Running) {
      simulateStreaming()
    }
  }
)

onMounted(() => {
  if (props.tracing.status === OFNodeRunningStatus.Running) {
    simulateStreaming()
  }
})
</script>
