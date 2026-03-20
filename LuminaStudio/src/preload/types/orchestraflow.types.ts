/**
 * OrchestraFlow (OF) 跨进程类型定义
 * 统一从 Public/ShareTypes/Orchestraflow-types 导出
 */
export * from '@shared/Orchestraflow-types'

/**
 * OrchestraFlow API Types
 * 工作流系统 IPC 接口类型定义
 */
import type {
  OFWorkflow,
  OFWorkflowMeta,
  OFWorkflowRunResult,
  OFNodeTracing,
  OFNodeDebugRunParams,
  OFNodeDebugResult
} from '@shared/Orchestraflow-types'
import type { RerankModelListResponse } from './rerank-model.types'

export interface OFWorkflowAPI {
  /**
   * OrchestraFlow 专用：拉取可用重排模型列表。
   */
  listRerankModels(): Promise<{
    success: boolean
    data?: RerankModelListResponse
    error?: string
  }>

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

  run(
    workflowId: string,
    inputs?: Record<string, unknown>
  ): Promise<{
    success: boolean
    data?: OFWorkflowRunResult
    error?: string
  }>

  runNodeDebug(params: OFNodeDebugRunParams): Promise<{
    success: boolean
    data?: OFNodeDebugResult
    error?: string
  }>

  stop(runId: string): Promise<{
    success: boolean
    error?: string
  }>

  onProgress(callback: (runId: string, progress: OFNodeTracing) => void): () => void
}
