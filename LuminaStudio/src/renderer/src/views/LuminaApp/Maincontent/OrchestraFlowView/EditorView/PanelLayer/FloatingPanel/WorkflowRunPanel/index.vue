<template>
  <FloatingPanel
    :visible="visible"
    :z-index="zIndex"
    :offset-x="offsetX"
    :active="active"
    title="运行测试"
    description="填写输入参数并测试工作流"
    @close="handleClose"
    @focus="handleFocus"
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
          <template v-for="section in traceSections" :key="section.key">
            <div v-if="section.kind === 'trace'" class="relative pl-4">
              <component
                :is="getTraceComponent(section.tracing.nodeType)"
                :tracing="section.tracing"
                :all-traces="runStore.tracingList"
              />
            </div>

            <div v-else class="rounded-xl border border-cyan-100 bg-cyan-50/50 p-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-semibold text-cyan-800">
                    第 {{ section.iterationIndex + 1 }} 轮
                  </div>
                  <div class="mt-1 text-xs text-cyan-600">
                    {{ section.scopeLabel }}
                  </div>
                </div>
                <div class="text-xs text-cyan-600">
                  {{ section.parallelRunId || 'serial' }}
                </div>
              </div>

              <div class="mt-3 space-y-3 pl-4">
                <div v-for="tracing in section.traces" :key="getTraceKey(tracing)" class="relative pl-4">
                  <component
                    :is="getTraceComponent(tracing.nodeType)"
                    :tracing="tracing"
                    :all-traces="runStore.tracingList"
                  />
                </div>
              </div>
            </div>
          </template>
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
import IterationNodeOutput from './nodes/IterationNodeOutput.vue'
import LoopNodeOutput from './nodes/LoopNodeOutput.vue'
import IfElseNodeOutput from './nodes/IfElseNodeOutput.vue'
import VariableAssignNodeOutput from './nodes/VariableAssignNodeOutput.vue'
import EndNodeOutput from './nodes/EndNodeOutput.vue'
import StartTab from './tabs/StartTab.vue'
import DetailTab from './tabs/DetailTab.vue'
import TracingTab from './tabs/TracingTab.vue'
import { useWorkflowRunStore } from '@renderer/stores/orchestraflow/workflow-run/workflow-run.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import {
  getOFTraceIdentity,
  OFWorkflowRunningStatus,
  OFBlockEnum,
  type OFNodeTracing
} from '@shared/Orchestraflow-types'

interface Props {
  visible: boolean
  zIndex?: number
  offsetX?: number
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  zIndex: 30,
  offsetX: 0,
  active: false
})

const emit = defineEmits<{
  close: []
  focus: []
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

type TraceSection =
  | { kind: 'trace'; key: string; tracing: OFNodeTracing }
  | {
      kind: 'iteration-round'
      key: string
      iterationIndex: number
      parallelRunId?: string
      scopeLabel: string
      traces: OFNodeTracing[]
    }

const traceSections = computed<TraceSection[]>(() => {
  const sections: TraceSection[] = []
  const grouped = new Map<string, TraceSection & { kind: 'iteration-round' }>()

  for (const tracing of runStore.tracingList) {
      const inIterationId = tracing.execution_metadata?.in_iteration_id
      const iterationIndex = tracing.execution_metadata?.iteration_index
      const inLoopId = tracing.execution_metadata?.in_loop_id
      const loopIndex = tracing.execution_metadata?.loop_index

      if ((!inIterationId || iterationIndex === undefined) && (!inLoopId || loopIndex === undefined)) {
        sections.push({ kind: 'trace', key: getTraceKey(tracing), tracing })
        continue
      }

      const scopeId = inIterationId || inLoopId
      const scopeIndex = iterationIndex ?? loopIndex ?? 0
      const key = `${scopeId}::${scopeIndex}::${tracing.execution_metadata?.parallel_run_id || 'serial'}`
      const existing = grouped.get(key)

    if (existing) {
      existing.traces.push(tracing)
      continue
    }

    const nextSection: TraceSection & { kind: 'iteration-round' } = {
        kind: 'iteration-round',
        key,
        iterationIndex: scopeIndex,
        parallelRunId: tracing.execution_metadata?.parallel_run_id,
        scopeLabel: (tracing.scope_path || tracing.execution_metadata?.scope_path || []).join(' / ') || 'root',
        traces: [tracing]
    }
    grouped.set(key, nextSection)
    sections.push(nextSection)
  }

  return sections
})

function handleClose(): void {
  emit('close')
}

function handleFocus(): void {
  emit('focus')
}

function handleRunAgain(): void {
  if (editorStore.currentWorkflowId) {
    activeTab.value = 'start'
    runStore.runWorkflow(editorStore.currentWorkflowId, runStore.startInputs)
  }
}

function getTraceKey(tracing: OFNodeTracing): string {
  return getOFTraceIdentity(tracing)
}

function getTraceComponent(nodeType: OFBlockEnum) {
  switch (nodeType) {
    case OFBlockEnum.Start:
      return StartNodeOutput
    case OFBlockEnum.LLM:
      return LLMNodeOutput
    case OFBlockEnum.Iteration:
      return IterationNodeOutput
    case OFBlockEnum.Loop:
      return LoopNodeOutput
    case OFBlockEnum.LoopStart:
      return StartNodeOutput
    case OFBlockEnum.IfElse:
      return IfElseNodeOutput
    case OFBlockEnum.VariableAssign:
      return VariableAssignNodeOutput
    case OFBlockEnum.End:
      return EndNodeOutput
    default:
      return StartNodeOutput
  }
}
</script>
