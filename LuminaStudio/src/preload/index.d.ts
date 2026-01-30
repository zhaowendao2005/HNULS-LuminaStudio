import { ElectronAPI } from '@electron-toolkit/preload'

// 导出所有跨进程类型
export * from './types'

// 导入 API 类型
import type { API } from './bridge'

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
