/**
 * OrchestraFlow 工作流运行 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WorkflowRunState } from './workflow-run.types'
import type { OFWorkflowRunResult, OFNodeTracing } from '@shared/Orchestraflow-types'
import { OFWorkflowRunningStatus, OFNodeRunningStatus } from '@shared/Orchestraflow-types'
import { WorkflowRunDataSource } from './workflow-run.datasource'

export const useWorkflowRunStore = defineStore('orchestraflow-workflow-run', () => {
  // ===== State =====
  const status = ref<OFWorkflowRunningStatus>(OFWorkflowRunningStatus.NotStarted)
  const result = ref<OFWorkflowRunResult | null>(null)
  const running = ref(false)
  const currentWorkflowId = ref<string | null>(null)
  const currentRunId = ref<string | null>(null)

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

    // 设置进度监听
    progressUnsubscribe = WorkflowRunDataSource.onProgress((runId, progress) => {
      currentRunId.value = runId
      handleProgress(progress)
    })

    try {
      const runResult = await WorkflowRunDataSource.run({ workflowId, inputs })
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
    const index = tracing.findIndex((t) => t.nodeId === progress.nodeId)

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
    if (!currentWorkflowId.value) return

    try {
      await WorkflowRunDataSource.stop(currentWorkflowId.value)
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
    if (progressUnsubscribe) {
      progressUnsubscribe()
      progressUnsubscribe = null
    }
  }

  // 获取指定节点的结果
  function getNodeTracing(nodeId: string): OFNodeTracing | undefined {
    return result.value?.tracing.find((t) => t.nodeId === nodeId)
  }

  return {
    // state
    status,
    result,
    running,
    currentWorkflowId,
    currentRunId,

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
    getNodeTracing
  }
})
