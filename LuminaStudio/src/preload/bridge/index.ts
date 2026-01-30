/**
 * Preload Bridge
 * 聚合所有 API 并通过 contextBridge 安全暴露给渲染进程
 */

import { contextBridge } from 'electron'
import { utilsAPI } from '../api/utils-api'

// 定义暴露给渲染进程的 API 结构
const api = {
  utils: utilsAPI
  // 按需添加其他业务域 API
  // file: fileAPI,
  // database: databaseAPI,
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('api', api)

// 导出类型供 TypeScript 使用
export type API = typeof api
