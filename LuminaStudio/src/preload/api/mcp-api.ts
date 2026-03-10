import { ipcRenderer } from 'electron'
import type {
  McpAPI,
  McpCallToolRequest,
  McpChatAbortRequest,
  McpChatStartRequest,
  McpConnectRequest,
  McpDisconnectRequest,
  McpGetPromptRequest,
  McpReadResourceRequest,
  McpServerPreset,
  McpSessionEvent,
  McpSessionScopedRequest,
  McpTraceEvent,
  McpChatStreamEvent
} from '../types'

export const mcpAPI: McpAPI = {
  listPresets: () => ipcRenderer.invoke('mcp:listPresets'),
  savePreset: (preset: McpServerPreset) => ipcRenderer.invoke('mcp:savePreset', preset),
  deletePreset: (presetId: string) => ipcRenderer.invoke('mcp:deletePreset', presetId),
  connect: (request: McpConnectRequest) => ipcRenderer.invoke('mcp:connect', request),
  disconnect: (request?: McpDisconnectRequest) => ipcRenderer.invoke('mcp:disconnect', request),
  getSessionState: (request?: McpDisconnectRequest) =>
    ipcRenderer.invoke('mcp:getSessionState', request),
  listSessionStates: () => ipcRenderer.invoke('mcp:listSessionStates'),
  listTools: (request: McpSessionScopedRequest) => ipcRenderer.invoke('mcp:listTools', request),
  callTool: (request: McpCallToolRequest) => ipcRenderer.invoke('mcp:callTool', request),
  listPrompts: (request: McpSessionScopedRequest) => ipcRenderer.invoke('mcp:listPrompts', request),
  getPrompt: (request: McpGetPromptRequest) => ipcRenderer.invoke('mcp:getPrompt', request),
  listResources: (request: McpSessionScopedRequest) =>
    ipcRenderer.invoke('mcp:listResources', request),
  readResource: (request: McpReadResourceRequest) =>
    ipcRenderer.invoke('mcp:readResource', request),
  startChat: (request: McpChatStartRequest) => ipcRenderer.invoke('mcp:startChat', request),
  abortChat: (request: McpChatAbortRequest) => ipcRenderer.invoke('mcp:abortChat', request),
  onSessionEvent: (handler: (event: McpSessionEvent) => void) => {
    const listener = (_event: unknown, payload: McpSessionEvent) => handler(payload)
    ipcRenderer.on('mcp:session-event', listener)
    return () => ipcRenderer.off('mcp:session-event', listener)
  },
  onTrace: (handler: (event: McpTraceEvent) => void) => {
    const listener = (_event: unknown, payload: McpTraceEvent) => handler(payload)
    ipcRenderer.on('mcp:trace', listener)
    return () => ipcRenderer.off('mcp:trace', listener)
  },
  onChatStream: (handler: (event: McpChatStreamEvent) => void) => {
    const listener = (_event: unknown, payload: McpChatStreamEvent) => handler(payload)
    ipcRenderer.on('mcp:chat-stream', listener)
    return () => ipcRenderer.off('mcp:chat-stream', listener)
  }
}
