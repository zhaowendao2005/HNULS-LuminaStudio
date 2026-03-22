import { ipcRenderer } from 'electron'
import type {
  KnowledgeDatabaseAPI,
  KnowledgeDatabaseListDocsRequest,
  KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest,
  KnowledgeDatabaseSearchKnowledgeRetrievalRequest,
  KGRetrievalSearchRequest
} from '../types'

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
  },

  resolveKnowledgeRetrievalScopes: (
    request: KnowledgeDatabaseResolveKnowledgeRetrievalScopesRequest
  ) => {
    return ipcRenderer.invoke('knowledgeDatabase:resolveKnowledgeRetrievalScopes', request)
  },

  searchKnowledgeRetrieval: (request: KnowledgeDatabaseSearchKnowledgeRetrievalRequest) => {
    return ipcRenderer.invoke('knowledgeDatabase:searchKnowledgeRetrieval', request)
  },

  // ==================== 知识图谱（KG）检索 ====================

  getKGConfigs: (knowledgeBaseId: number) => {
    return ipcRenderer.invoke('knowledgeDatabase:getKGConfigs', knowledgeBaseId)
  },

  getKGGraphTables: (knowledgeBaseId: number) => {
    return ipcRenderer.invoke('knowledgeDatabase:getKGGraphTables', knowledgeBaseId)
  },

  listKGModels: () => {
    return ipcRenderer.invoke('knowledgeDatabase:listKGModels')
  },

  kgRetrievalSearch: (request: KGRetrievalSearchRequest) => {
    return ipcRenderer.invoke('knowledgeDatabase:kgRetrievalSearch', request)
  }
}
