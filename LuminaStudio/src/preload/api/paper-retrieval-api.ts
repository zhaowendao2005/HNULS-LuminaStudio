import { ipcRenderer } from 'electron'
import type { PaperRetrievalAPI, PaperRetrievalSearchRequest } from '../types/paper-retrieval.types'

/**
 * Paper Retrieval API。
 *
 * 这里只负责把渲染进程请求转发到主进程 IPC，
 * 不在 preload 层夹带业务逻辑。
 */
export const paperRetrievalAPI: PaperRetrievalAPI = {
  listProviders: () => {
    return ipcRenderer.invoke('paperRetrieval:listProviders')
  },

  getProviderDescriptor: (providerId: string) => {
    return ipcRenderer.invoke('paperRetrieval:getProviderDescriptor', providerId)
  },

  search: (request: PaperRetrievalSearchRequest) => {
    return ipcRenderer.invoke('paperRetrieval:search', request)
  }
}
