/**
 * OrchestraFlow API
 */
import { ipcRenderer } from 'electron'
import type { OFWorkflowAPI } from '../types/orchestraflow.types'

export const orchestraflowAPI: OFWorkflowAPI = {
  list: (params) => ipcRenderer.invoke('orchestraflow:workflow-list', params),
  get: (workflowId) => ipcRenderer.invoke('orchestraflow:workflow-get', workflowId),
  create: (data) => ipcRenderer.invoke('orchestraflow:workflow-create', data),
  update: (workflowId, data) => ipcRenderer.invoke('orchestraflow:workflow-update', workflowId, data),
  delete: (workflowId) => ipcRenderer.invoke('orchestraflow:workflow-delete', workflowId),
  getAISchemaBundle: () => ipcRenderer.invoke('orchestraflow:ai-schema-bundle'),
  listGenerationSessions: () => ipcRenderer.invoke('orchestraflow:generation-list'),
  getGenerationSession: (sessionId) => ipcRenderer.invoke('orchestraflow:generation-get', sessionId),
  createGenerationSession: (data) => ipcRenderer.invoke('orchestraflow:generation-create', data),
  sendGenerationPrompt: (sessionId, prompt) =>
    ipcRenderer.invoke('orchestraflow:generation-send-prompt', sessionId, prompt),
  sendGenerationAgentMessage: (sessionId, agentId, input) =>
    ipcRenderer.invoke('orchestraflow:generation-send-agent-message', sessionId, agentId, input),
  resolveGenerationApproval: (sessionId, approvalId, decision, note) =>
    ipcRenderer.invoke(
      'orchestraflow:generation-resolve-approval',
      sessionId,
      approvalId,
      decision,
      note
    ),
  runGenerationStage: (sessionId, stage) =>
    ipcRenderer.invoke('orchestraflow:generation-run-stage', sessionId, stage),
  advanceGenerationPhase: (sessionId, phase) =>
    ipcRenderer.invoke('orchestraflow:generation-advance-phase', sessionId, phase),
  rollbackGenerationCheckpoint: (sessionId, checkpointId) =>
    ipcRenderer.invoke('orchestraflow:generation-rollback-checkpoint', sessionId, checkpointId),
  updateGenerationPhaseModels: (sessionId, phaseModels) =>
    ipcRenderer.invoke('orchestraflow:generation-update-phase-models', sessionId, phaseModels),
  updateGenerationAgentConfig: (sessionId, agentId, patch) =>
    ipcRenderer.invoke('orchestraflow:generation-update-agent-config', sessionId, agentId, patch),
  confirmGenerationSession: (sessionId) => ipcRenderer.invoke('orchestraflow:generation-confirm', sessionId),
  deleteGenerationSession: (sessionId) => ipcRenderer.invoke('orchestraflow:generation-delete', sessionId),
  run: (workflowId, inputs) => ipcRenderer.invoke('orchestraflow:workflow-run', workflowId, inputs),
  runNodeDebug: (params) => ipcRenderer.invoke('orchestraflow:node-debug-run', params),
  stop: (runId) => ipcRenderer.invoke('orchestraflow:workflow-stop', runId),
  onProgress: (callback) => {
    const handler = (_event: unknown, data: { runId: string; progress: unknown }) => {
      callback(data.runId, data.progress as never)
    }
    ipcRenderer.on('orchestraflow:workflow-progress', handler)
    return () => {
      ipcRenderer.removeListener('orchestraflow:workflow-progress', handler)
    }
  },
  onGenerationAgentEvent: (callback) => {
    const handler = (_event: unknown, event: unknown) => {
      callback(event as never)
    }
    ipcRenderer.on('orchestraflow:generation-agent-event', handler)
    return () => {
      ipcRenderer.removeListener('orchestraflow:generation-agent-event', handler)
    }
  }
}
