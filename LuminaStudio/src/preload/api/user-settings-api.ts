import { ipcRenderer } from 'electron'
import type { UserSettingsAPI } from '../types'

/**
 * User Settings API
 *
 * 通过 IPC 与主进程通信，实现用户设置管理
 */
export const userSettingsAPI: UserSettingsAPI = {
  getSettings: () => {
    return ipcRenderer.invoke('userSettings:getSettings')
  },

  updateSettings: (patch) => {
    return ipcRenderer.invoke('userSettings:updateSettings', patch)
  },

  getApiKeys: () => {
    return ipcRenderer.invoke('userSettings:getApiKeys')
  },

  updateApiKeys: (keys) => {
    return ipcRenderer.invoke('userSettings:updateApiKeys', keys)
  }
}
