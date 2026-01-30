import { electronAPI } from '@electron-toolkit/preload'

// 导入并执行 bridge，暴露 API 到渲染进程
import './bridge'

// 暴露 electron API
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electron', electronAPI)
