/**
 * OrchestraFlow Workflow Run DataSource
 * 工作流运行数据源 - 支持 IPC 调用
 */
import type { OFWorkflowRunResult, OFNodeTracing } from '@shared/Orchestraflow-types'

export interface WorkflowRunParams {
  workflowId: string
  inputs?: Record<string, any>
}

export interface ProgressCallback {
  (runId: string, progress: OFNodeTracing): void
}

export const WorkflowRunDataSource = {
  /**
   * 运行工作流
   */
  async run(params: WorkflowRunParams): Promise<OFWorkflowRunResult> {
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
    const res = await window.api.orchestraflow.stop(workflowId)
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
