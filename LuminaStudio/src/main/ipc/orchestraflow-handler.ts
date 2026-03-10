/**
 * OrchestraFlow IPC Handler
 * 处理工作流相关的 IPC 请求
 */
import { ipcMain, BrowserWindow } from 'electron'
import { OrchestraflowWorkflowService } from '../services/orchestraflow/orchestraflow-workflow-service'
import { orchestraflowAISchemaService } from '../services/orchestraflow/orchestraflow-ai-schema-service'
import { orchestraflowBridge } from '../services/orchestraflow-bridge'
import { logger } from '../services/logger'
import { OrchestraflowGenerationService } from '../services/orchestraflow-generation/orchestraflow-generation-service'
import { ModelConfigService } from '../services/model-config'
import type { OFNodeTracing, OFNodeDebugRunParams } from '@shared/Orchestraflow-types'
import type { PersistedModelProviderConfig } from '../services/model-config'

const log = logger.scope('OrchestraflowIPCHandler')

export class OrchestraflowIPCHandler {
  constructor(
    private readonly service: OrchestraflowWorkflowService,
    private readonly modelConfigService: ModelConfigService,
    private readonly generationService: OrchestraflowGenerationService
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

    // generation session list
    ipcMain.handle('orchestraflow:generation-list', async () => {
      try {
        return { success: true, data: this.generationService.listGenerationSessions() }
      } catch (e) {
        log.error('Failed to list generation sessions', e)
        return { success: false, error: String(e) }
      }
    })

    ipcMain.handle('orchestraflow:generation-get', async (_event, sessionId) => {
      try {
        const session = this.generationService.getGenerationSession(String(sessionId))
        if (!session) {
          return { success: false, error: 'Generation session not found' }
        }
        return { success: true, data: session }
      } catch (e) {
        log.error('Failed to get generation session', e)
        return { success: false, error: String(e) }
      }
    })

    ipcMain.handle('orchestraflow:generation-create', async (_event, data) => {
      try {
        if (!data || typeof data.workflow_name !== 'string') {
          return { success: false, error: 'Invalid generation session data' }
        }
        return {
          success: true,
          data: this.generationService.createGenerationSession(data)
        }
      } catch (e) {
        log.error('Failed to create generation session', e)
        return { success: false, error: String(e) }
      }
    })

    ipcMain.handle('orchestraflow:generation-send-prompt', async (_event, sessionId, prompt) => {
      try {
        return {
          success: true,
          data: await this.generationService.sendGenerationPrompt(
            String(sessionId),
            String(prompt || '')
          )
        }
      } catch (e) {
        log.error('Failed to send generation prompt', e)
        return { success: false, error: String(e) }
      }
    })

    ipcMain.handle('orchestraflow:generation-advance-phase', async (_event, sessionId, phase) => {
      try {
        return {
          success: true,
          data: await this.generationService.advanceGenerationPhase(String(sessionId), phase)
        }
      } catch (e) {
        log.error('Failed to advance generation phase', e)
        return { success: false, error: String(e) }
      }
    })

    ipcMain.handle(
      'orchestraflow:generation-rollback-checkpoint',
      async (_event, sessionId, checkpointId) => {
        try {
          return {
            success: true,
            data: await this.generationService.rollbackGenerationCheckpoint(
              String(sessionId),
              String(checkpointId)
            )
          }
        } catch (e) {
          log.error('Failed to rollback generation checkpoint', e)
          return { success: false, error: String(e) }
        }
      }
    )

    ipcMain.handle(
      'orchestraflow:generation-update-phase-models',
      async (_event, sessionId, phaseModels) => {
        try {
          return {
            success: true,
            data: this.generationService.updateGenerationPhaseModels(String(sessionId), phaseModels)
          }
        } catch (e) {
          log.error('Failed to update generation phase models', e)
          return { success: false, error: String(e) }
        }
      }
    )

    ipcMain.handle('orchestraflow:generation-confirm', async (_event, sessionId) => {
      try {
        return {
          success: true,
          data: await this.generationService.confirmGenerationSession(String(sessionId))
        }
      } catch (e) {
        log.error('Failed to confirm generation session', e)
        return { success: false, error: String(e) }
      }
    })

    ipcMain.handle('orchestraflow:generation-delete', async (_event, sessionId) => {
      try {
        return {
          success: true,
          data: this.generationService.deleteGenerationSession(String(sessionId))
        }
      } catch (e) {
        log.error('Failed to delete generation session', e)
        return { success: false, error: String(e) }
      }
    })

    // 导出 AI Schema bundle
    ipcMain.handle('orchestraflow:ai-schema-bundle', async () => {
      try {
        const bundle = orchestraflowAISchemaService.getBundle()
        return { success: true, data: bundle }
      } catch (e) {
        log.error('Failed to build AI schema bundle', e)
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

    // 节点单独调试
    ipcMain.handle('orchestraflow:node-debug-run', async (_event, params: OFNodeDebugRunParams) => {
      try {
        if (!params || typeof params.workflowId !== 'string' || typeof params.nodeId !== 'string') {
          return { success: false, error: 'Invalid params' }
        }

        const workflow = await this.service.get(params.workflowId)
        if (!workflow) {
          return { success: false, error: 'Workflow not found' }
        }

        const modelConfig = await this.modelConfigService.getConfig()
        const providerConfigs: Record<string, PersistedModelProviderConfig> = {}
        for (const provider of modelConfig.providers) {
          providerConfigs[provider.id] = provider
        }

        const result = await orchestraflowBridge.runNodeDebug(
          workflow,
          params.nodeId,
          params.inputs || {},
          params.scopePath,
          providerConfigs
        )

        return { success: true, data: result }
      } catch (e) {
        log.error('Failed to run node debug', e)
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
