/**
 * OrchestraFlow API
 * 通过 IPC 与主进程通信，实现工作流管理
 */
import { ipcRenderer } from 'electron'
import type { OFWorkflowAPI } from '../types/orchestraflow.types'

export const orchestraflowAPI: OFWorkflowAPI = {
  list: (params) => {
    return ipcRenderer.invoke('orchestraflow:workflow-list', params)
  },

  get: (workflowId) => {
    return ipcRenderer.invoke('orchestraflow:workflow-get', workflowId)
  },

  create: (data) => {
    return ipcRenderer.invoke('orchestraflow:workflow-create', data)
  },

  update: (workflowId, data) => {
    return ipcRenderer.invoke('orchestraflow:workflow-update', workflowId, data)
  },

  delete: (workflowId) => {
    return ipcRenderer.invoke('orchestraflow:workflow-delete', workflowId)
  },

  getAISchemaBundle: () => {
    return ipcRenderer.invoke('orchestraflow:ai-schema-bundle')
  },

  listGenerationSessions: () => {
    return ipcRenderer.invoke('orchestraflow:generation-list')
  },

  getGenerationSession: (sessionId) => {
    return ipcRenderer.invoke('orchestraflow:generation-get', sessionId)
  },

  createGenerationSession: (data) => {
    return ipcRenderer.invoke('orchestraflow:generation-create', data)
  },

  sendGenerationPrompt: (sessionId, prompt) => {
    return ipcRenderer.invoke('orchestraflow:generation-send-prompt', sessionId, prompt)
  },

  advanceGenerationPhase: (sessionId, phase) => {
    return ipcRenderer.invoke('orchestraflow:generation-advance-phase', sessionId, phase)
  },

  rollbackGenerationCheckpoint: (sessionId, checkpointId) => {
    return ipcRenderer.invoke(
      'orchestraflow:generation-rollback-checkpoint',
      sessionId,
      checkpointId
    )
  },

  updateGenerationPhaseModels: (sessionId, phaseModels) => {
    return ipcRenderer.invoke(
      'orchestraflow:generation-update-phase-models',
      sessionId,
      phaseModels
    )
  },

  confirmGenerationSession: (sessionId) => {
    return ipcRenderer.invoke('orchestraflow:generation-confirm', sessionId)
  },

  deleteGenerationSession: (sessionId) => {
    return ipcRenderer.invoke('orchestraflow:generation-delete', sessionId)
  },

  run: (workflowId, inputs) => {
    return ipcRenderer.invoke('orchestraflow:workflow-run', workflowId, inputs)
  },

  runNodeDebug: (params) => {
    return ipcRenderer.invoke('orchestraflow:node-debug-run', params)
  },

  stop: (runId) => {
    return ipcRenderer.invoke('orchestraflow:workflow-stop', runId)
  },

  onProgress: (callback) => {
    const handler = (_event: any, data: { runId: string; progress: any }) => {
      callback(data.runId, data.progress)
    }
    ipcRenderer.on('orchestraflow:workflow-progress', handler)
    return () => {
      ipcRenderer.removeListener('orchestraflow:workflow-progress', handler)
    }
  }
}
