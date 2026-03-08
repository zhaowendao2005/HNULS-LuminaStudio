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
        <div class="text-xs text-gray-400">{{ runStore.result?.tracing.length }} 个节点</div>
      </div>

      <!-- 输入输出面板 -->
      <div class="grid grid-cols-2 gap-4">
        <!-- 输入列 -->
        <div class="flex flex-col">
          <div class="text-xs font-medium text-gray-500 uppercase mb-2">输入 (Inputs)</div>
          <div
            class="flex-1 bg-gray-50 rounded-lg p-3 cursor-pointer"
            @click="toggleExpanded('global-inputs')"
          >
            <div class="text-xs text-gray-700 whitespace-pre-wrap break-all">
              {{ getPreview(inputsJson, expandedStates['global-inputs']) }}
            </div>
            <div
              v-if="shouldTruncate(inputsJson)"
              class="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {{ expandedStates['global-inputs'] ? '收起' : '展开' }}
            </div>
          </div>
        </div>

        <!-- 输出列 -->
        <div class="flex flex-col">
          <div class="text-xs font-medium text-gray-500 uppercase mb-2">输出 (Outputs)</div>
          <div
            class="flex-1 bg-gray-50 rounded-lg p-3 cursor-pointer"
            @click="toggleExpanded('global-outputs')"
          >
            <div class="text-xs text-gray-700 whitespace-pre-wrap break-all">
              {{ getPreview(outputsJson, expandedStates['global-outputs']) }}
            </div>
            <div
              v-if="shouldTruncate(outputsJson)"
              class="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {{ expandedStates['global-outputs'] ? '收起' : '展开' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 每个节点的详情 -->
      <div class="space-y-3">
        <div class="text-xs font-medium text-gray-500 uppercase">节点详情</div>
        <template v-for="section in traceSections" :key="section.key">
          <div
            v-if="section.kind === 'iteration-round'"
            class="rounded-xl border border-cyan-100 bg-cyan-50/50 p-3"
          >
            <div class="text-sm font-semibold text-cyan-800">
              第 {{ section.iterationIndex + 1 }} 轮
            </div>
            <div class="mt-1 text-xs text-cyan-600">{{ section.scopeLabel }}</div>

            <div class="mt-3 space-y-3 pl-4">
              <div
                v-for="tracing in section.traces"
                :key="getTraceKey(tracing)"
                class="border border-gray-200 rounded-lg overflow-hidden"
              >
                <!-- 节点标题 -->
                <div class="flex items-center justify-between px-3 py-2 bg-gray-50">
                  <div class="flex items-center gap-2">
                    <div>
                      <div class="text-sm font-medium text-gray-700">
                        {{ getNodeTitle(tracing) }}
                      </div>
                      <div class="text-xs text-gray-400">{{ formatTraceMeta(tracing) }}</div>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 text-xs rounded" :class="getStatusClass(tracing.status)">
                    {{ getStatusText(tracing.status) }}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-px bg-gray-200">
                  <div
                    class="bg-white p-2 cursor-pointer"
                    @click="toggleExpanded(`${getTraceKey(tracing)}:input`)"
                  >
                    <div class="text-xs text-gray-400 mb-1">输入</div>
                    <div class="text-xs text-gray-700 whitespace-pre-wrap break-all">
                      {{
                        getPreview(
                          formatJson(tracing.inputs),
                          expandedStates[`${getTraceKey(tracing)}:input`]
                        )
                      }}
                    </div>
                    <div
                      v-if="shouldTruncate(formatJson(tracing.inputs))"
                      class="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {{ expandedStates[`${getTraceKey(tracing)}:input`] ? '收起' : '展开' }}
                    </div>
                  </div>
                  <div
                    class="bg-white p-2 cursor-pointer"
                    @click="toggleExpanded(`${getTraceKey(tracing)}:output`)"
                  >
                    <div class="text-xs text-gray-400 mb-1">输出</div>
                    <div class="text-xs text-gray-700 whitespace-pre-wrap break-all">
                      {{
                        getPreview(
                          formatJson(tracing.outputs),
                          expandedStates[`${getTraceKey(tracing)}:output`]
                        )
                      }}
                    </div>
                    <div
                      v-if="shouldTruncate(formatJson(tracing.outputs))"
                      class="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {{ expandedStates[`${getTraceKey(tracing)}:output`] ? '收起' : '展开' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="border border-gray-200 rounded-lg overflow-hidden">
            <!-- 节点标题 -->
            <div class="flex items-center justify-between px-3 py-2 bg-gray-50">
              <div class="flex items-center gap-2">
                <div>
                  <div class="text-sm font-medium text-gray-700">
                    {{ getNodeTitle(section.tracing) }}
                  </div>
                  <div class="text-xs text-gray-400">{{ formatTraceMeta(section.tracing) }}</div>
                </div>
              </div>
              <span
                class="px-2 py-0.5 text-xs rounded"
                :class="getStatusClass(section.tracing.status)"
              >
                {{ getStatusText(section.tracing.status) }}
              </span>
            </div>

            <!-- 节点输入输出 -->
            <div class="grid grid-cols-2 gap-px bg-gray-200">
              <div
                class="bg-white p-2 cursor-pointer"
                @click="toggleExpanded(`${getTraceKey(section.tracing)}:input`)"
              >
                <div class="text-xs text-gray-400 mb-1">输入</div>
                <div class="text-xs text-gray-700 whitespace-pre-wrap break-all">
                  {{
                    getPreview(
                      formatJson(section.tracing.inputs),
                      expandedStates[`${getTraceKey(section.tracing)}:input`]
                    )
                  }}
                </div>
                <div
                  v-if="shouldTruncate(formatJson(section.tracing.inputs))"
                  class="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {{ expandedStates[`${getTraceKey(section.tracing)}:input`] ? '收起' : '展开' }}
                </div>
              </div>
              <div
                class="bg-white p-2 cursor-pointer"
                @click="toggleExpanded(`${getTraceKey(section.tracing)}:output`)"
              >
                <div class="text-xs text-gray-400 mb-1">输出</div>
                <div class="text-xs text-gray-700 whitespace-pre-wrap break-all">
                  {{
                    getPreview(
                      formatJson(section.tracing.outputs),
                      expandedStates[`${getTraceKey(section.tracing)}:output`]
                    )
                  }}
                </div>
                <div
                  v-if="shouldTruncate(formatJson(section.tracing.outputs))"
                  class="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {{ expandedStates[`${getTraceKey(section.tracing)}:output`] ? '收起' : '展开' }}
                </div>
              </div>
            </div>

            <!-- 错误信息 -->
            <div v-if="section.tracing.error" class="px-3 py-2 bg-red-50 border-t border-gray-200">
              <div class="text-xs text-red-600">错误: {{ section.tracing.error }}</div>
            </div>

            <!-- 执行时间 -->
            <div
              v-if="section.tracing.elapsed_time"
              class="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400"
            >
              耗时: {{ section.tracing.elapsed_time }}ms
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useWorkflowRunStore } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import {
  getOFTraceIdentity,
  OFBlockEnum,
  OFNodeRunningStatus,
  type OFNodeTracing
} from '@shared/Orchestraflow-types'

const runStore = useWorkflowRunStore()
const expandedStates = reactive<Record<string, boolean>>({})

type TraceSection =
  | { kind: 'trace'; key: string; tracing: OFNodeTracing }
  | {
      kind: 'iteration-round'
      key: string
      iterationIndex: number
      scopeLabel: string
      traces: OFNodeTracing[]
    }

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

const traceSections = computed<TraceSection[]>(() => {
  const sections: TraceSection[] = []
  const grouped = new Map<string, TraceSection & { kind: 'iteration-round' }>()

  for (const tracing of runStore.tracingList) {
    const inIterationId = tracing.execution_metadata?.in_iteration_id
    const iterationIndex = tracing.execution_metadata?.iteration_index

    if (!inIterationId || iterationIndex === undefined) {
      sections.push({ kind: 'trace', key: getTraceKey(tracing), tracing })
      continue
    }

    const key = `${inIterationId}::${iterationIndex}::${tracing.execution_metadata?.parallel_run_id || 'serial'}`
    const existing = grouped.get(key)
    if (existing) {
      existing.traces.push(tracing)
      continue
    }

    const nextSection: TraceSection & { kind: 'iteration-round' } = {
      kind: 'iteration-round',
      key,
      iterationIndex,
      scopeLabel:
        (tracing.scope_path || tracing.execution_metadata?.scope_path || []).join(' / ') || 'root',
      traces: [tracing]
    }
    grouped.set(key, nextSection)
    sections.push(nextSection)
  }

  return sections
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
    case OFBlockEnum.LLM:
      return 'LLM'
    case OFBlockEnum.Iteration:
      return '迭代'
    case OFBlockEnum.IfElse:
      return '条件分支'
    case OFBlockEnum.VariableAssign:
      return '变量赋值'
    case OFBlockEnum.End:
      return '结束'
    case OFBlockEnum.Loop:
      return '循环'
    case OFBlockEnum.LoopStart:
      return '循环开始'
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

function getTraceKey(tracing: OFNodeTracing): string {
  return getOFTraceIdentity(tracing)
}

function formatTraceMeta(tracing: OFNodeTracing): string {
  const parts = [tracing.nodeId]
  const scopePath = tracing.scope_path || tracing.execution_metadata?.scope_path || []
  if (scopePath.length) {
    parts.push(`scope=${scopePath.join('/')}`)
  }
  if (tracing.execution_metadata?.iteration_index !== undefined) {
    parts.push(`iteration=${tracing.execution_metadata.iteration_index}`)
  }
  if (tracing.execution_metadata?.parallel_run_id) {
    parts.push(`parallel=${tracing.execution_metadata.parallel_run_id}`)
  }
  return parts.join(' · ')
}

function shouldTruncate(value: string) {
  return value.length > 30
}

function getPreview(value: string, expanded = false) {
  return expanded || !shouldTruncate(value) ? value : `${value.slice(0, 30)}...`
}

function toggleExpanded(key: string) {
  expandedStates[key] = !expandedStates[key]
}
</script>
