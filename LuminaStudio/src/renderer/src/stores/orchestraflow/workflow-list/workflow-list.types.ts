/**
 * OrchestraFlow 工作流列表类型定义
 */
import type { OFWorkflowMeta } from '@preload/types'

export interface WorkflowListState {
  workflows: OFWorkflowMeta[]
  loading: boolean
  searchKeyword: string
  currentPage: number
  pageSize: number
  total: number
}
