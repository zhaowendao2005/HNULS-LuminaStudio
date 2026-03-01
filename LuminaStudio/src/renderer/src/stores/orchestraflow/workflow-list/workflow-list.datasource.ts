/**
 * OrchestraFlow 工作流列表数据源
 * 开发环境使用 mock，生产环境对接 IPC
 */
import type { OFWorkflowMeta } from '@preload/types'
import { mockWorkflows } from './workflow-list.mock'

export class WorkflowListDatasource {
  /**
   * 获取工作流列表
   */
  async getWorkflows(params: { keyword?: string; page?: number; pageSize?: number }): Promise<{
    workflows: OFWorkflowMeta[]
    total: number
  }> {
    // TODO: 生产环境对接 IPC
    // 当前使用 mock
    let filtered = [...mockWorkflows]

    if (params.keyword) {
      const keyword = params.keyword.toLowerCase()
      filtered = filtered.filter(
        (w) =>
          w.name.toLowerCase().includes(keyword) || w.description?.toLowerCase().includes(keyword)
      )
    }

    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      workflows: filtered.slice(start, end),
      total: filtered.length
    }
  }

  /**
   * 创建工作流
   */
  async createWorkflow(data: {
    name: string
    description?: string
    icon?: string
    iconBackground?: string
  }): Promise<OFWorkflowMeta> {
    // TODO: 生产环境对接 IPC
    const newWorkflow: OFWorkflowMeta = {
      id: `of-wf-${Date.now()}`,
      name: data.name,
      description: data.description,
      icon: data.icon || '📋',
      iconBackground: data.iconBackground || '#E5E7EB',
      author: '赵文道',
      createdAt: Date.now() / 1000,
      updatedAt: Date.now() / 1000,
      status: 'draft',
      nodeCount: 0,
      tags: []
    }
    return newWorkflow
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(id: string): Promise<void> {
    // TODO: 生产环境对接 IPC
  }

  /**
   * 更新工作流
   */
  async updateWorkflow(id: string, data: Partial<OFWorkflowMeta>): Promise<OFWorkflowMeta> {
    // TODO: 生产环境对接 IPC
    throw new Error('Not implemented')
  }
}
