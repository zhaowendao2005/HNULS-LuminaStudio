/**
 * Preload Bridge
 * 聚合所有 API，并通过 contextBridge 安全暴露给渲染进程
 */

import { contextBridge } from 'electron'
import { utilsAPI } from '../api/utils-api'
import { windowAPI } from '../api/window-api'
import { modelConfigAPI } from '../api/model-config-api'
import { aiChatAPI } from '../api/ai-chat-api'
import { knowledgeDatabaseAPI } from '../api/knowledge-database-api'

const api = {
  utils: utilsAPI,
  window: windowAPI,
  modelConfig: modelConfigAPI,
  aiChat: aiChatAPI,
  knowledgeDatabase: knowledgeDatabaseAPI
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
