import { ipcRenderer } from 'electron'
import type {
  AiChatAPI,
  AiChatStartRequest,
  AiChatAbortRequest,
  AiChatHistoryRequest,
  AiChatStreamEvent,
  AiChatConversationListRequest,
  AiChatCreatePresetRequest,
  AiChatCreateConversationRequest,
  AiChatDeleteConversationRequest,
  AiChatDeletePresetRequest
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
  createPreset: (request: AiChatCreatePresetRequest) => {
    return ipcRenderer.invoke('aiChat:createPreset', request)
  },

  createConversation: (request: AiChatCreateConversationRequest) => {
    return ipcRenderer.invoke('aiChat:createConversation', request)
  },

  presets: () => {
    return ipcRenderer.invoke('aiChat:presets')
  },

  conversations: (request: AiChatConversationListRequest) => {
    return ipcRenderer.invoke('aiChat:conversations', request)
  },

  deleteConversation: (request: AiChatDeleteConversationRequest) => {
    return ipcRenderer.invoke('aiChat:deleteConversation', request)
  },

  deletePreset: (request: AiChatDeletePresetRequest) => {
    return ipcRenderer.invoke('aiChat:deletePreset', request)
  },

  onStream: (handler: (event: AiChatStreamEvent) => void) => {
    const listener = (_event: unknown, payload: AiChatStreamEvent) => handler(payload)
    ipcRenderer.on('aiChat:stream', listener)
    return () => ipcRenderer.off('aiChat:stream', listener)
  }
}
