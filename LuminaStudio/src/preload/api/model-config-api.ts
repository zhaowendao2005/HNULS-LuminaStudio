import { ipcRenderer } from 'electron'
import type { ModelConfig, ModelConfigAPI, SmokeTestPromptSettings } from '../types'

/**
 * Model Config API
 *
 * 通过 IPC 与主进程通信，实现模型配置管理。
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
  },

  testProvider: (providerId: string, modelId: string, prompt?: string) => {
    return ipcRenderer.invoke('modelConfig:testProvider', providerId, modelId, prompt)
  },

  getSmokeTestPromptSettings: () => {
    return ipcRenderer.invoke('modelConfig:getSmokeTestPromptSettings')
  },

  updateSmokeTestPromptSettings: (settings: SmokeTestPromptSettings) => {
    return ipcRenderer.invoke('modelConfig:updateSmokeTestPromptSettings', settings)
  }
}
