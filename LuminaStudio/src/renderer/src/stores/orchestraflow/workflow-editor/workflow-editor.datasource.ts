/**
 * OrchestraFlow 工作流编辑器数据源
 */
import type { OFNode, OFEdge } from './workflow-editor.types'
import { createDefaultWorkflow } from './workflow-editor.mock'

export class WorkflowEditorDatasource {
  /**
   * 获取工作流数据
   */
  async getWorkflow(workflowId: string): Promise<{
    nodes: OFNode[]
    edges: OFEdge[]
  }> {
    // TODO: 生产环境对接 IPC
    // 当前返回默认工作流
    return createDefaultWorkflow()
  }

  /**
   * 保存工作流
   */
  async saveWorkflow(workflowId: string, data: {
    nodes: OFNode[]
    edges: OFEdge[]
  }): Promise<void> {
    // TODO: 生产环境对接 IPC
  }
}
