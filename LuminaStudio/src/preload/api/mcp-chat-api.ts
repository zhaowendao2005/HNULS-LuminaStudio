import { ipcRenderer } from 'electron'
import type {
  McpChatAPI,
  McpChatAbortRequest,
  McpChatCreateSessionRequest,
  McpChatDeleteSessionRequest,
  McpChatSaveSettingsRequest,
  McpChatSendMessageRequest,
  McpChatStreamEvent,
  McpChatUpdateSessionRequest
} from '../types'

export const mcpChatAPI: McpChatAPI = {
  getBootstrap: () => ipcRenderer.invoke('mcpChat:getBootstrap'),
  refreshServers: () => ipcRenderer.invoke('mcpChat:refreshServers'),
  createSession: (request: McpChatCreateSessionRequest) =>
    ipcRenderer.invoke('mcpChat:createSession', request),
  updateSession: (request: McpChatUpdateSessionRequest) =>
    ipcRenderer.invoke('mcpChat:updateSession', request),
  deleteSession: (request: McpChatDeleteSessionRequest) =>
    ipcRenderer.invoke('mcpChat:deleteSession', request),
  sendMessage: (request: McpChatSendMessageRequest) =>
    ipcRenderer.invoke('mcpChat:sendMessage', request),
  abort: (request: McpChatAbortRequest) => ipcRenderer.invoke('mcpChat:abort', request),
  saveSettings: (request: McpChatSaveSettingsRequest) =>
    ipcRenderer.invoke('mcpChat:saveSettings', request),
  onStream: (handler: (event: McpChatStreamEvent) => void) => {
    const listener = (_event: unknown, payload: McpChatStreamEvent) => handler(payload)
    ipcRenderer.on('mcpChat:stream', listener)
    return () => ipcRenderer.off('mcpChat:stream', listener)
  }
}
