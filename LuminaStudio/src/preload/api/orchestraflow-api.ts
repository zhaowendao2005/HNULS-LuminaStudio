/**
 * OrchestraFlow API
 * 通过 IPC 与主进程通信，实现工作流管理
 */
import { ipcRenderer } from 'electron'
import type { OFWorkflowAPI } from '../types/orchestraflow-api.types'

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
  }
}
