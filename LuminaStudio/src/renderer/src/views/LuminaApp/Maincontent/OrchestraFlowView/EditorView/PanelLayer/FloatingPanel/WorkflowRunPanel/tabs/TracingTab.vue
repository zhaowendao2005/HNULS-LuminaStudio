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
                <div
                  class="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 text-left"
                >
                  <div class="flex items-center gap-2">
                    <div
                      class="flex items-center justify-center w-5 h-5 rounded text-white text-xs"
                      :class="getNodeIconClass(tracing.nodeType)"
                    >
                      {{ getNodeIcon(tracing.nodeType) }}
                    </div>
                    <span class="text-sm font-medium text-gray-700">
                      {{ getNodeTitle(tracing) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span v-if="tracing.elapsed_time" class="text-xs text-gray-400">
                      {{ tracing.elapsed_time }}ms
                    </span>
                    <span
                      class="px-2 py-0.5 text-xs rounded"
                      :class="getStatusClass(tracing.status)"
                    >
                      {{ getStatusText(tracing.status) }}
                    </span>
                  </div>
                </div>

                <div class="border-t border-gray-200 p-3 bg-white space-y-2">
                  <div class="rounded-md bg-gray-50 px-2 py-2 text-xs text-gray-500">
                    {{ formatTraceMeta(tracing) }}
                  </div>
                  <div
                    class="rounded-md bg-gray-50 px-2 py-2 cursor-pointer"
                    @click="toggleExpanded(`${getTraceKey(tracing)}:raw`)"
                  >
                    <div class="text-[11px] font-medium uppercase text-gray-400">Raw</div>
                    <div class="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-all">
                      {{
                        getPreview(
                          formatRawData(tracing),
                          expandedStates[`${getTraceKey(tracing)}:raw`]
                        )
                      }}
                    </div>
                    <div
                      v-if="shouldTruncate(formatRawData(tracing))"
                      class="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {{ expandedStates[`${getTraceKey(tracing)}:raw`] ? '收起' : '展开' }}
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div
                      class="rounded-md bg-gray-50 px-2 py-2 cursor-pointer"
                      @click="toggleExpanded(`${getTraceKey(tracing)}:input`)"
                    >
                      <div class="text-[11px] font-medium uppercase text-gray-400">Input</div>
                      <div class="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-all">
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
                      class="rounded-md bg-gray-50 px-2 py-2 cursor-pointer"
                      @click="toggleExpanded(`${getTraceKey(tracing)}:output`)"
                    >
                      <div class="text-[11px] font-medium uppercase text-gray-400">Output</div>
                      <div class="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-all">
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
          </div>

          <div v-else class="border border-gray-200 rounded-lg overflow-hidden">
            <div class="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 text-left">
              <div class="flex items-center gap-2">
                <!-- 节点图标 -->
                <div
                  class="flex items-center justify-center w-5 h-5 rounded text-white text-xs"
                  :class="getNodeIconClass(section.tracing.nodeType)"
                >
                  {{ getNodeIcon(section.tracing.nodeType) }}
                </div>
                <!-- 节点名称 -->
                <span class="text-sm font-medium text-gray-700">
                  {{ getNodeTitle(section.tracing) }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <!-- 耗时 -->
                <span v-if="section.tracing.elapsed_time" class="text-xs text-gray-400">
                  {{ section.tracing.elapsed_time }}ms
                </span>
                <!-- 状态 -->
                <span
                  class="px-2 py-0.5 text-xs rounded"
                  :class="getStatusClass(section.tracing.status)"
                >
                  {{ getStatusText(section.tracing.status) }}
                </span>
              </div>
            </div>

            <div class="border-t border-gray-200 p-3 bg-white space-y-2">
              <div class="rounded-md bg-gray-50 px-2 py-2 text-xs text-gray-500">
                {{ formatTraceMeta(section.tracing) }}
              </div>
              <div
                class="rounded-md bg-gray-50 px-2 py-2 cursor-pointer"
                @click="toggleExpanded(`${getTraceKey(section.tracing)}:raw`)"
              >
                <div class="text-[11px] font-medium uppercase text-gray-400">Raw</div>
                <div class="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-all">
                  {{
                    getPreview(
                      formatRawData(section.tracing),
                      expandedStates[`${getTraceKey(section.tracing)}:raw`]
                    )
                  }}
                </div>
                <div
                  v-if="shouldTruncate(formatRawData(section.tracing))"
                  class="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {{ expandedStates[`${getTraceKey(section.tracing)}:raw`] ? '收起' : '展开' }}
                </div>
              </div>

              <div v-if="section.tracing.error" class="p-3 bg-red-50 border-t border-gray-200">
                <div class="text-xs font-medium text-red-600 mb-1">错误信息</div>
                <div class="text-xs text-red-700">{{ section.tracing.error }}</div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div
                  class="rounded-md bg-gray-50 px-2 py-2 cursor-pointer"
                  @click="toggleExpanded(`${getTraceKey(section.tracing)}:input`)"
                >
                  <div class="text-[11px] font-medium uppercase text-gray-400">Input</div>
                  <div class="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-all">
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
                  class="rounded-md bg-gray-50 px-2 py-2 cursor-pointer"
                  @click="toggleExpanded(`${getTraceKey(section.tracing)}:output`)"
                >
                  <div class="text-[11px] font-medium uppercase text-gray-400">Output</div>
                  <div class="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-all">
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
    case OFBlockEnum.LLM:
      return 'L'
    case OFBlockEnum.Iteration:
      return 'R'
    case OFBlockEnum.VariableAssign:
      return 'V'
    case OFBlockEnum.IfElse:
      return 'I'
    case OFBlockEnum.End:
      return 'E'
    case OFBlockEnum.Loop:
      return 'O'
    case OFBlockEnum.LoopStart:
      return 'S'
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
    case OFBlockEnum.VariableAssign:
      return 'bg-sky-500'
    case OFBlockEnum.IfElse:
      return 'bg-cyan-500'
    case OFBlockEnum.End:
      return 'bg-green-500'
    case OFBlockEnum.Loop:
      return 'bg-amber-500'
    case OFBlockEnum.LoopStart:
      return 'bg-amber-400'
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
    case OFBlockEnum.VariableAssign:
      return '变量赋值节点'
    case OFBlockEnum.IfElse:
      return '条件分支节点'
    case OFBlockEnum.End:
      return '结束节点'
    case OFBlockEnum.Loop:
      return '循环节点'
    case OFBlockEnum.LoopStart:
      return '循环开始节点'
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

function getTraceKey(tracing: OFNodeTracing): string {
  return getOFTraceIdentity(tracing)
}

function formatTraceMeta(tracing: OFNodeTracing): string {
  const parts = [`node=${tracing.nodeId}`]
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
