/**
 * OrchestraFlow 工作流运行类型定义
 */
import type {
  OFWorkflowRunningStatus,
  OFNodeRunningStatus,
  OFWorkflowRunResult
} from '@preload/types'

export interface WorkflowRunState {
  status: OFWorkflowRunningStatus
  result: OFWorkflowRunResult | null
  running: boolean
}
