import { ipcRenderer } from 'electron'
import type { KnowledgeDatabaseAPI, KnowledgeDatabaseListDocsRequest } from '../types'

/**
 * Knowledge Database API
 *
 * 通过 IPC 与主进程通信，调用外部 KnowledgeDatabase REST 服务
 */
export const knowledgeDatabaseAPI: KnowledgeDatabaseAPI = {
  checkConnection: () => {
    return ipcRenderer.invoke('knowledgeDatabase:checkConnection')
  },

  listKnowledgeBases: () => {
    return ipcRenderer.invoke('knowledgeDatabase:listKnowledgeBases')
  },

  listDocuments: (request: KnowledgeDatabaseListDocsRequest) => {
    return ipcRenderer.invoke('knowledgeDatabase:listDocuments', request)
  }
}
