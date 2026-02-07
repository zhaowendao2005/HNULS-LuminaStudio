import { ipcRenderer } from 'electron'
import type { RerankModelAPI } from '../types'

/**
 * Rerank Model API
 *
 * 通过 IPC 与主进程通信，从 KnowledgeDatabase REST 服务获取重排模型列表
 */
export const rerankModelAPI: RerankModelAPI = {
  listRerankModels: () => {
    return ipcRenderer.invoke('rerankModel:listModels')
  }
}
