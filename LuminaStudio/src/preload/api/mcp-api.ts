import { ipcRenderer } from 'electron'
import type {
  McpAPI,
  McpCallToolRequest,
  McpConnectRequest,
  McpGetPromptRequest,
  McpReadResourceRequest,
  McpServerPreset,
  McpSessionEvent,
  McpTraceEvent
} from '../types'

export const mcpAPI: McpAPI = {
  listPresets: () => ipcRenderer.invoke('mcp:listPresets'),
  savePreset: (preset: McpServerPreset) => ipcRenderer.invoke('mcp:savePreset', preset),
  deletePreset: (presetId: string) => ipcRenderer.invoke('mcp:deletePreset', presetId),
  connect: (request: McpConnectRequest) => ipcRenderer.invoke('mcp:connect', request),
  disconnect: () => ipcRenderer.invoke('mcp:disconnect'),
  getSessionState: () => ipcRenderer.invoke('mcp:getSessionState'),
  listTools: () => ipcRenderer.invoke('mcp:listTools'),
  callTool: (request: McpCallToolRequest) => ipcRenderer.invoke('mcp:callTool', request),
  listPrompts: () => ipcRenderer.invoke('mcp:listPrompts'),
  getPrompt: (request: McpGetPromptRequest) => ipcRenderer.invoke('mcp:getPrompt', request),
  listResources: () => ipcRenderer.invoke('mcp:listResources'),
  readResource: (request: McpReadResourceRequest) =>
    ipcRenderer.invoke('mcp:readResource', request),
  onSessionEvent: (handler: (event: McpSessionEvent) => void) => {
    const listener = (_event: unknown, payload: McpSessionEvent) => handler(payload)
    ipcRenderer.on('mcp:session-event', listener)
    return () => ipcRenderer.off('mcp:session-event', listener)
  },
  onTrace: (handler: (event: McpTraceEvent) => void) => {
    const listener = (_event: unknown, payload: McpTraceEvent) => handler(payload)
    ipcRenderer.on('mcp:trace', listener)
    return () => ipcRenderer.off('mcp:trace', listener)
  }
}
