/**
 * OrchestraFlow 工作流运行 Store
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WorkflowRunState } from './workflow-run.types'
import type { OFWorkflowRunResult } from '@preload/types'
import { OFWorkflowRunningStatus } from '@preload/types'
import { createMockRunResult } from './workflow-run.mock'

export const useWorkflowRunStore = defineStore('orchestraflow-workflow-run', () => {
  // ===== State =====
  const status = ref<OFWorkflowRunningStatus>(OFWorkflowRunningStatus.NotStarted)
  const result = ref<OFWorkflowRunResult | null>(null)
  const running = ref(false)

  // ===== Actions =====
  async function runWorkflow(workflowId: string, inputs?: Record<string, any>) {
    running.value = true
    status.value = OFWorkflowRunningStatus.Running

    // TODO: 生产环境对接 IPC
    // 当前使用 mock
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const mockResult = createMockRunResult()
    result.value = mockResult
    status.value = mockResult.status
    running.value = false
  }

  function stopWorkflow() {
    running.value = false
    status.value = OFWorkflowRunningStatus.Stopped
  }

  function reset() {
    status.value = OFWorkflowRunningStatus.NotStarted
    result.value = null
    running.value = false
  }

  return {
    // state
    status,
    result,
    running,

    // actions
    runWorkflow,
    stopWorkflow,
    reset
  }
})
