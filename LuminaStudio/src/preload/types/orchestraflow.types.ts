/**
 * OrchestraFlow (OF) 跨进程类型定义
 * 统一从 Public/ShareTypes/Orchestraflow-types 导出
 */
export * from '@shared/Orchestraflow-types'

/**
 * OrchestraFlow API Types
 * 工作流系统 IPC 接口类型定义
 */
import type { OFWorkflow, OFWorkflowMeta, OFWorkflowRunResult, OFNodeTracing } from '@shared/Orchestraflow-types'

export interface OFWorkflowAPI {
  list(params?: { keyword?: string; page?: number; pageSize?: number }): Promise<{
    success: boolean
    data?: { workflows: OFWorkflowMeta[]; total: number }
    error?: string
  }>

  get(workflowId: string): Promise<{
    success: boolean
    data?: OFWorkflow
    error?: string
  }>

  create(data: {
    name: string
    description?: string
    author: string
    icon?: string
    iconBackground?: string
  }): Promise<{
    success: boolean
    data?: OFWorkflow
    error?: string
  }>

  update(
    workflowId: string,
    data: Partial<OFWorkflow>
  ): Promise<{
    success: boolean
    data?: OFWorkflow
    error?: string
  }>

  delete(workflowId: string): Promise<{
    success: boolean
    error?: string
  }>

  run(workflowId: string, inputs?: Record<string, any>): Promise<{
    success: boolean
    data?: OFWorkflowRunResult
    error?: string
  }>

  stop(runId: string): Promise<{
    success: boolean
    error?: string
  }>

  onProgress(callback: (runId: string, progress: OFNodeTracing) => void): () => void
}
