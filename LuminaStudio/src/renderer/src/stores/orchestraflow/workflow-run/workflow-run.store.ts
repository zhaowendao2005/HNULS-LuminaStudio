/**
 * OrchestraFlow 工作流运行 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OFWorkflowRunResult, OFNodeTracing, OFInputVar } from '@shared/Orchestraflow-types'
import {
  getOFTraceIdentity,
  OFWorkflowRunningStatus,
  OFNodeRunningStatus,
  OFBlockEnum
} from '@shared/Orchestraflow-types'
import { WorkflowRunDataSource } from './workflow-run.datasource'
import { useWorkflowEditorStore } from '../workflow-editor/workflow-editor.store'

export const useWorkflowRunStore = defineStore('orchestraflow-workflow-run', () => {
  const editorStore = useWorkflowEditorStore()

  // ===== State =====
  const status = ref<OFWorkflowRunningStatus>(OFWorkflowRunningStatus.NotStarted)
  const result = ref<OFWorkflowRunResult | null>(null)
  const running = ref(false)
  const currentWorkflowId = ref<string | null>(null)
  const currentRunId = ref<string | null>(null)
  const startInputs = ref<Record<string, any>>({})

  // 进度监听器
  let progressUnsubscribe: (() => void) | null = null

  // ===== Computed =====
  const hasResult = computed(() => result.value !== null)
  const isRunning = computed(() => running.value)
  const isSucceeded = computed(() => status.value === OFWorkflowRunningStatus.Succeeded)
  const isFailed = computed(() => status.value === OFWorkflowRunningStatus.Failed)
  const tracingList = computed(() => result.value?.tracing || [])

  // ===== Actions =====
  async function runWorkflow(workflowId: string, inputs?: Record<string, any>) {
    running.value = true
    status.value = OFWorkflowRunningStatus.Running
    currentWorkflowId.value = workflowId
    currentRunId.value = null
    result.value = null
    editorStore.resetAllNodeRunningStatus(OFNodeRunningStatus.NotStarted)

    // 设置进度监听
    progressUnsubscribe = WorkflowRunDataSource.onProgress((runId, progress) => {
      if (!currentRunId.value) {
        currentRunId.value = runId
      }
      if (runId !== currentRunId.value) {
        return
      }
      currentRunId.value = runId
      handleProgress(progress)
      editorStore.updateNodeRunningStatus(progress.nodeId, progress.status)
    })

    try {
      const runResult = await WorkflowRunDataSource.run({
        workflowId,
        inputs
      })
      result.value = runResult
      status.value = runResult.status
    } catch (error) {
      console.error('Workflow run failed:', error)
      status.value = OFWorkflowRunningStatus.Failed
      result.value = {
        status: OFWorkflowRunningStatus.Failed,
        tracing: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      running.value = false
      if (progressUnsubscribe) {
        progressUnsubscribe()
        progressUnsubscribe = null
      }
    }
  }

  function handleProgress(progress: OFNodeTracing) {
    const tracing = result.value?.tracing || []
    const identity = getOFTraceIdentity(progress)
    const index = tracing.findIndex((t) => getOFTraceIdentity(t) === identity)

    if (index >= 0) {
      tracing[index] = progress
    } else {
      tracing.push(progress)
    }

    if (!result.value) {
      result.value = {
        status: OFWorkflowRunningStatus.Running,
        tracing
      }
    } else {
      result.value.tracing = tracing
    }
  }

  async function stopWorkflow() {
    if (!currentRunId.value) return

    try {
      await WorkflowRunDataSource.stop(currentRunId.value)
    } catch (error) {
      console.error('Failed to stop workflow:', error)
    } finally {
      running.value = false
      status.value = OFWorkflowRunningStatus.Stopped
      if (progressUnsubscribe) {
        progressUnsubscribe()
        progressUnsubscribe = null
      }
    }
  }

  function reset() {
    status.value = OFWorkflowRunningStatus.NotStarted
    result.value = null
    running.value = false
    currentWorkflowId.value = null
    currentRunId.value = null
    startInputs.value = {}
    if (progressUnsubscribe) {
      progressUnsubscribe()
      progressUnsubscribe = null
    }
  }

  // 获取指定节点的结果
  function getNodeTracing(nodeId: string): OFNodeTracing | undefined {
    return result.value?.tracing.find((t) => t.nodeId === nodeId)
  }

  // 设置开始节点输入
  function setStartInputs(inputs: Record<string, any>) {
    startInputs.value = inputs
  }

  // 更新单个输入字段
  function updateStartInput(key: string, value: any) {
    startInputs.value[key] = value
  }

  // 校验开始节点输入（需要传入 Start 节点的 inputs 定义）
  function validateStartInputs(inputVars: OFInputVar[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const inputVar of inputVars) {
      if (inputVar.required) {
        const value = startInputs.value[inputVar.variable]
        if (value === undefined || value === null || value === '') {
          errors.push(`"${inputVar.label || inputVar.variable}" 为必填项`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // 获取 Start 节点的输入定义
  function getStartNodeInputs(nodes: { id: string; data: any }[]): OFInputVar[] {
    const startNode = nodes.find((n) => n.data.type === OFBlockEnum.Start)
    if (startNode && (startNode.data as any).input?.variables) {
      return (startNode.data as any).input.variables as OFInputVar[]
    }
    return []
  }

  return {
    // state
    status,
    result,
    running,
    currentWorkflowId,
    currentRunId,
    startInputs,

    // computed
    hasResult,
    isRunning,
    isSucceeded,
    isFailed,
    tracingList,

    // actions
    runWorkflow,
    stopWorkflow,
    reset,
    getNodeTracing,
    setStartInputs,
    updateStartInput,
    validateStartInputs,
    getStartNodeInputs
  }
})
