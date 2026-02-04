/**
 * Preload Bridge
 * 聚合所有 API，并通过 contextBridge 安全暴露给渲染进程
 */

import { contextBridge } from 'electron'
import { utilsAPI } from '../api/utils-api'
import { windowAPI } from '../api/window-api'

const api = {
  utils: utilsAPI,
  window: windowAPI
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
