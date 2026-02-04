import { ipcRenderer } from 'electron'
import type { WindowMaximizedChangedPayload } from '../types'

export const windowAPI = {
  async minimize(): Promise<void> {
    await ipcRenderer.invoke('window:minimize')
  },

  async toggleMaximize(): Promise<void> {
    await ipcRenderer.invoke('window:toggle-maximize')
  },

  async close(): Promise<void> {
    await ipcRenderer.invoke('window:close')
  },

  async isMaximized(): Promise<boolean> {
    return await ipcRenderer.invoke('window:is-maximized')
  },

  async toggleFullScreen(): Promise<void> {
    await ipcRenderer.invoke('window:toggle-fullscreen')
  },

  onMaximizedChanged(handler: (payload: WindowMaximizedChangedPayload) => void): () => void {
    const listener = (_event: unknown, payload: WindowMaximizedChangedPayload) => handler(payload)
    ipcRenderer.on('window:maximized-changed', listener)
    return () => ipcRenderer.off('window:maximized-changed', listener)
  }
}
