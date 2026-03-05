/**
 * OrchestraFlow IPC Handler
 * 处理工作流相关的 IPC 请求
 */
import { ipcMain, BrowserWindow } from 'electron'
import { OrchestraflowWorkflowService } from '../services/orchestraflow/orchestraflow-workflow-service'
import { orchestraflowBridge } from '../services/orchestraflow-bridge'
import { logger } from '../services/logger'
import { ModelConfigService } from '../services/model-config'
import type { OFNodeTracing } from '@shared/Orchestraflow-types'
import type { PersistedModelProviderConfig } from '../services/model-config'

const log = logger.scope('OrchestraflowIPCHandler')

export class OrchestraflowIPCHandler {
  constructor(
    private readonly service: OrchestraflowWorkflowService,
    private readonly modelConfigService: ModelConfigService
  ) {
    this.register()
    this.registerProgressHandler()
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

    // 运行工作流
    ipcMain.handle('orchestraflow:workflow-run', async (_event, workflowId, inputs) => {
      try {
        if (typeof workflowId !== 'string') {
          return { success: false, error: 'Invalid workflowId' }
        }
        // 获取工作流数据
        const workflow = await this.service.get(workflowId)
        if (!workflow) {
          return { success: false, error: 'Workflow not found' }
        }

        // 获取模型配置
        const modelConfig = await this.modelConfigService.getConfig()
        const providerConfigs: Record<string, PersistedModelProviderConfig> = {}
        for (const provider of modelConfig.providers) {
          providerConfigs[provider.id] = provider
        }

        // 调用 Bridge 运行工作流，传入模型配置
        const result = await orchestraflowBridge.runWorkflow(
          workflowId,
          workflow,
          inputs || {},
          providerConfigs
        )
        return { success: true, data: result }
      } catch (e) {
        log.error('Failed to run workflow', e)
        return { success: false, error: String(e) }
      }
    })

    // 停止工作流
    ipcMain.handle('orchestraflow:workflow-stop', async (_event, runId) => {
      try {
        if (typeof runId !== 'string') {
          return { success: false, error: 'Invalid runId' }
        }
        orchestraflowBridge.stopWorkflow(runId)
        return { success: true }
      } catch (e) {
        log.error('Failed to stop workflow', e)
        return { success: false, error: String(e) }
      }
    })

    log.info('Orchestraflow IPC handlers registered')
  }

  private registerProgressHandler(): void {
    // 注册进度事件处理器，将进度推送到渲染进程
    orchestraflowBridge.onProgress((runId: string, progress: OFNodeTracing) => {
      // 获取所有 BrowserWindow 并推送进度
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('orchestraflow:workflow-progress', { runId, progress })
      }
    })
  }
}
