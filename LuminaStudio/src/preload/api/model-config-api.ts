import { ipcRenderer } from 'electron'
import type { ModelConfig, ModelConfigAPI } from '../types'

/**
 * Model Config API
 *
 * 通过 IPC 与主进程通信，实现模型配置管理
 */
export const modelConfigAPI: ModelConfigAPI = {
  get: () => {
    return ipcRenderer.invoke('modelConfig:get')
  },

  update: (patch: Partial<ModelConfig>) => {
    return ipcRenderer.invoke('modelConfig:update', patch)
  },

  syncModels: (providerId: string) => {
    return ipcRenderer.invoke('modelConfig:syncModels', providerId)
  }
}
