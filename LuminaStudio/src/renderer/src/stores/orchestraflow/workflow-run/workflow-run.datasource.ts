/**
 * OrchestraFlow Workflow Run DataSource
 * 工作流运行数据源 - 支持 IPC 调用和 Mock 切换
 */
import type { OFWorkflowRunResult } from '@shared/Orchestraflow-types'
import { createMockRunResult } from './workflow-run.mock'

export interface WorkflowRunParams {
  workflowId: string
  inputs?: Record<string, any>
}

export const WorkflowRunDataSource = {
  /**
   * 运行工作流
   * TODO: 生产环境对接真实 IPC
   */
  async run(params: WorkflowRunParams): Promise<OFWorkflowRunResult> {
    // 生产环境调用 IPC
    // const res = await window.api.orchestraflow.run(params.workflowId, params.inputs)
    // if (!res.success || !res.data) {
    //   throw new Error(res.error || 'Failed to run workflow')
    // }
    // return res.data

    // 当前使用 Mock
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return createMockRunResult()
  },

  /**
   * 停止工作流运行
   */
  async stop(workflowId: string): Promise<void> {
    // 生产环境调用 IPC
    // const res = await window.api.orchestraflow.stop(workflowId)
    // if (!res.success) {
    //   throw new Error(res.error || 'Failed to stop workflow')
    // }

    // Mock 环境直接返回
    console.log('[Mock] Workflow stopped:', workflowId)
  }
}
