/**
 * OrchestraFlow Workflow List DataSource
 * 工作流列表数据源 - 直接调用 IPC
 */
import type { OFWorkflowMeta } from '@shared/Orchestraflow-types'

export class WorkflowListDatasource {
  /**
   * 获取工作流列表
   */
  async getWorkflows(params: { keyword?: string; page?: number; pageSize?: number }): Promise<{
    workflows: OFWorkflowMeta[]
    total: number
  }> {
    const res = await window.api.orchestraflow.list(params)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load workflows')
    }
    return res.data
  }

  /**
   * 创建工作流
   */
  async createWorkflow(data: {
    name: string
    description?: string
    author: string
    icon?: string
    iconBackground?: string
  }): Promise<OFWorkflowMeta> {
    const res = await window.api.orchestraflow.create(data)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to create workflow')
    }
    return {
      id: res.data.id,
      name: res.data.name,
      description: res.data.description,
      icon: data.icon || 'ClipboardDocumentListIcon',
      iconBackground: data.iconBackground || '#E5E7EB',
      author: res.data.author,
      createdAt: res.data.createdAt,
      updatedAt: res.data.updatedAt,
      status: res.data.status,
      nodeCount: res.data.graph?.nodes?.length || 0,
      tags: []
    }
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(id: string): Promise<void> {
    const res = await window.api.orchestraflow.delete(id)
    if (!res.success) {
      throw new Error(res.error || 'Failed to delete workflow')
    }
  }

  /**
   * 更新工作流
   */
  async updateWorkflow(id: string, data: Partial<OFWorkflowMeta>): Promise<OFWorkflowMeta> {
    throw new Error('Not implemented')
  }
}
