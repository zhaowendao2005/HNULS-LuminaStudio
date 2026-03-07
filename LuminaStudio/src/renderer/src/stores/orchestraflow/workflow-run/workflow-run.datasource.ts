/**
 * OrchestraFlow Workflow Run DataSource
 * 工作流运行数据源 - 支持 IPC 调用与迭代节点 mock
 */
import type { OFNode, OFWorkflowRunResult, OFNodeTracing } from '@shared/Orchestraflow-types'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import { createMockProgressSequence, createMockRunResult } from './workflow-run.mock'

export interface WorkflowRunParams {
  workflowId: string
  inputs?: Record<string, any>
  nodes?: OFNode[]
}

export interface ProgressCallback {
  (runId: string, progress: OFNodeTracing): void
}

const mockListeners = new Set<ProgressCallback>()
let mockTimers: ReturnType<typeof setTimeout>[] = []
let currentMockRunId: string | null = null

function emitMockProgress(runId: string, progress: OFNodeTracing): void {
  mockListeners.forEach((listener) => listener(runId, progress))
}

function clearMockTimers(): void {
  mockTimers.forEach((timer) => clearTimeout(timer))
  mockTimers = []
}

function shouldUseIterationMock(nodes?: OFNode[]): boolean {
  return Boolean(nodes?.some((node) => node.data.type === OFBlockEnum.Iteration))
}

function runIterationMock(params: WorkflowRunParams): Promise<OFWorkflowRunResult> {
  // TODO:
  // 当前迭代节点运行仍走前端演示 mock。
  // 接后端后需要移除这条分支，改为透传真实的 iteration scope / item / index 注入结果。
  clearMockTimers()
  currentMockRunId = `mock-run-${Date.now()}`
  const runId = currentMockRunId
  const progressList = createMockProgressSequence(params.nodes || [], params.inputs)
  const finalResult = createMockRunResult(params.nodes || [], params.inputs)

  progressList.forEach((progress, index) => {
    const timer = setTimeout(() => {
      if (currentMockRunId !== runId) return
      emitMockProgress(runId, progress)
    }, index * 220)
    mockTimers.push(timer)
  })

  return new Promise((resolve) => {
    const timer = setTimeout(
      () => {
        if (currentMockRunId === runId) {
          finalResult.tracing.forEach((progress, index) => {
            emitMockProgress(runId, {
              ...progress,
              status: progress.status
            })
            if (index === finalResult.tracing.length - 1) {
              currentMockRunId = null
            }
          })
        }
        resolve(finalResult)
      },
      Math.max(progressList.length, 1) * 220 + 120
    )
    mockTimers.push(timer)
  })
}

export const WorkflowRunDataSource = {
  /**
   * 运行工作流
   */
  async run(params: WorkflowRunParams): Promise<OFWorkflowRunResult> {
    if (shouldUseIterationMock(params.nodes)) {
      return runIterationMock(params)
    }

    const res = await window.api.orchestraflow.run(params.workflowId, params.inputs)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to run workflow')
    }
    return res.data
  },

  /**
   * 停止工作流运行
   */
  async stop(workflowId: string): Promise<void> {
    if (currentMockRunId) {
      clearMockTimers()
      currentMockRunId = null
      return
    }

    const res = await window.api.orchestraflow.stop(workflowId)
    if (!res.success) {
      throw new Error(res.error || 'Failed to stop workflow')
    }
  },

  /**
   * 监听工作流进度
   */
  onProgress(callback: ProgressCallback): () => void {
    mockListeners.add(callback)
    const unsubscribeIPC = window.api.orchestraflow.onProgress(callback)

    return () => {
      mockListeners.delete(callback)
      unsubscribeIPC()
    }
  }
}
