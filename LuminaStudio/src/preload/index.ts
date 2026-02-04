import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 执行 bridge：暴露 window.api
import './bridge'

// 暴露 window.electron（electron-toolkit 便捷 API）
contextBridge.exposeInMainWorld('electron', electronAPI)
