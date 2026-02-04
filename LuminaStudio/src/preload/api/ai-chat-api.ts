import { ipcRenderer } from 'electron'
import type {
  AiChatAPI,
  AiChatStartRequest,
  AiChatAbortRequest,
  AiChatHistoryRequest,
  AiChatStreamEvent
} from '../types'

/**
 * AI Chat API
 *
 * 通过 IPC 与主进程通信，实现 AI 对话流式生成
 */
export const aiChatAPI: AiChatAPI = {
  start: (request: AiChatStartRequest) => {
    return ipcRenderer.invoke('aiChat:start', request)
  },

  abort: (request: AiChatAbortRequest) => {
    return ipcRenderer.invoke('aiChat:abort', request)
  },

  history: (request: AiChatHistoryRequest) => {
    return ipcRenderer.invoke('aiChat:history', request)
  },

  onStream: (handler: (event: AiChatStreamEvent) => void) => {
    const listener = (_event: unknown, payload: AiChatStreamEvent) => handler(payload)
    ipcRenderer.on('aiChat:stream', listener)
    return () => ipcRenderer.off('aiChat:stream', listener)
  }
}
