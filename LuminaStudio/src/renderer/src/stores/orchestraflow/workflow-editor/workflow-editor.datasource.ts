/**
 * OrchestraFlow Workflow DataSource
 * 工作流编辑器数据源 - 直接调用 IPC
 */
import type {
  OFWorkflow,
  OFWorkflowMeta,
  OFNode,
  OFEdge
} from '@shared/Orchestraflow-types'

export interface WorkflowListParams {
  keyword?: string
  page?: number
  pageSize?: number
}

export interface WorkflowListResult {
  workflows: OFWorkflowMeta[]
  total: number
}

export const WorkflowEditorDataSource = {
  /**
   * 获取工作流列表
   */
  async list(params: WorkflowListParams = {}): Promise<WorkflowListResult> {
    const res = await window.api.orchestraflow.list(params)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load workflows')
    }
    return res.data
  },

  /**
   * 获取单个工作流
   */
  async get(workflowId: string): Promise<{ nodes: OFNode[]; edges: OFEdge[] }> {
    const res = await window.api.orchestraflow.get(workflowId)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load workflow')
    }
    return { nodes: res.data.graph.nodes, edges: res.data.graph.edges }
  },

  /**
   * 创建工作流
   */
  async create(data: { name: string; description?: string }): Promise<OFWorkflow> {
    const res = await window.api.orchestraflow.create(data)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to create workflow')
    }
    return res.data
  },

  /**
   * 更新工作流
   */
  async update(workflowId: string, data: { nodes: OFNode[]; edges: OFEdge[] }): Promise<void> {
    const res = await window.api.orchestraflow.update(workflowId, { graph: data })
    if (!res.success) {
      throw new Error(res.error || 'Failed to update workflow')
    }
  },

  /**
   * 删除工作流
   */
  async delete(workflowId: string): Promise<void> {
    const res = await window.api.orchestraflow.delete(workflowId)
    if (!res.success) {
      throw new Error(res.error || 'Failed to delete workflow')
    }
  }
}
