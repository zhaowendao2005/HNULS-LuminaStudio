/**
 * OrchestraFlow IPC Handler
 * 处理工作流相关的 IPC 请求
 */
import { ipcMain } from 'electron'
import { OrchestraflowWorkflowService } from '../services/orchestraflow/orchestraflow-workflow-service'
import { logger } from '../services/logger'

const log = logger.scope('OrchestraflowIPCHandler')

export class OrchestraflowIPCHandler {
  constructor(private readonly service: OrchestraflowWorkflowService) {
    this.register()
  }

  private register(): void {
    // 工作流列表
    ipcMain.handle('orchestraflow:workflow-list', async (_event, params) => {
      try {
        const result = await this.service.list(params)
        return { success: true, data: result }
      } catch (e) {
        log.error('Failed to list workflows', e)
        return { success: false, error: String(e) }
      }
    })

    // 获取工作流
    ipcMain.handle('orchestraflow:workflow-get', async (_event, workflowId) => {
      try {
        if (typeof workflowId !== 'string') {
          return { success: false, error: 'Invalid workflowId' }
        }
        const workflow = await this.service.get(workflowId)
        if (!workflow) {
          return { success: false, error: 'Workflow not found' }
        }
        return { success: true, data: workflow }
      } catch (e) {
        log.error('Failed to get workflow', e)
        return { success: false, error: String(e) }
      }
    })

    // 创建工作流
    ipcMain.handle('orchestraflow:workflow-create', async (_event, data) => {
      try {
        if (!data || typeof data.name !== 'string') {
          return { success: false, error: 'Invalid data' }
        }
        const workflow = await this.service.create(data)
        return { success: true, data: workflow }
      } catch (e) {
        log.error('Failed to create workflow', e)
        return { success: false, error: String(e) }
      }
    })

    // 更新工作流
    ipcMain.handle('orchestraflow:workflow-update', async (_event, workflowId, data) => {
      try {
        if (typeof workflowId !== 'string') {
          return { success: false, error: 'Invalid workflowId' }
        }
        const workflow = await this.service.update(workflowId, data)
        if (!workflow) {
          return { success: false, error: 'Workflow not found' }
        }
        return { success: true, data: workflow }
      } catch (e) {
        log.error('Failed to update workflow', e)
        return { success: false, error: String(e) }
      }
    })

    // 删除工作流
    ipcMain.handle('orchestraflow:workflow-delete', async (_event, workflowId) => {
      try {
        if (typeof workflowId !== 'string') {
          return { success: false, error: 'Invalid workflowId' }
        }
        const result = await this.service.delete(workflowId)
        if (!result) {
          return { success: false, error: 'Workflow not found' }
        }
        return { success: true }
      } catch (e) {
        log.error('Failed to delete workflow', e)
        return { success: false, error: String(e) }
      }
    })

    log.info('Orchestraflow IPC handlers registered')
  }
}
