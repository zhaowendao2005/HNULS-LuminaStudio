/**
 * OrchestraFlow 工作流运行类型定义
 */
import type { OFWorkflowRunningStatus, OFWorkflowRunResult } from '@shared/Orchestraflow-types'

export interface WorkflowRunState {
  status: OFWorkflowRunningStatus
  result: OFWorkflowRunResult | null
  running: boolean
}
