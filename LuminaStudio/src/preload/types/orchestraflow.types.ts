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
  OFAISchemaBundle,
  OFWorkflow,
  OFWorkflowMeta,
  OFWorkflowRunResult,
  OFNodeTracing,
  OFNodeDebugRunParams,
  OFNodeDebugResult
} from '@shared/Orchestraflow-types'

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

  /**
   * 导出给 AI 使用的可运行 OrchestraFlow 工作流 bundle。
   * 该 bundle 的目标是让 AI 直接生成可写入工作流目录的最终 JSON，
   * 而不是再经过额外编译步骤的中间格式。
   */
  getAISchemaBundle(): Promise<{
    success: boolean
    data?: OFAISchemaBundle
    error?: string
  }>

  run(
    workflowId: string,
    inputs?: Record<string, any>
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
