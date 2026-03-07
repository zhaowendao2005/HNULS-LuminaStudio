/**
 * OrchestraFlow Workflow Run DataSource
 * 工作流运行数据源 - 统一通过 IPC 调用真实后端
 */
import type { OFWorkflowRunResult, OFNodeTracing } from '@shared/Orchestraflow-types'

export interface WorkflowRunParams {
  workflowId: string
  inputs?: Record<string, any>
}

export interface ProgressCallback {
  (runId: string, progress: OFNodeTracing): void
}

function toPlainObject(value: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!value) return undefined
  return JSON.parse(JSON.stringify(value))
}

export const WorkflowRunDataSource = {
  /**
   * 运行工作流
   */
  async run(params: WorkflowRunParams): Promise<OFWorkflowRunResult> {
    const res = await window.api.orchestraflow.run(
      params.workflowId,
      toPlainObject(params.inputs)
    )
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to run workflow')
    }
    return res.data
  },

  /**
   * 停止工作流运行
   */
  async stop(runId: string): Promise<void> {
    const res = await window.api.orchestraflow.stop(runId)
    if (!res.success) {
      throw new Error(res.error || 'Failed to stop workflow')
    }
  },

  /**
   * 监听工作流进度
   */
  onProgress(callback: ProgressCallback): () => void {
    return window.api.orchestraflow.onProgress(callback)
  }
}
