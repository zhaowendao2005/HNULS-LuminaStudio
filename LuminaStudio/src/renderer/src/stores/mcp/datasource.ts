import type {
  McpPromptRenderResult,
  McpPromptSummary,
  McpResourceReadResult,
  McpResourceSummary,
  McpServerPreset,
  McpSessionState,
  McpToolCallResult,
  McpToolSummary,
  McpTraceEvent
} from '@preload/types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || 'MCP request failed')
  }
  return response.data
}

export const McpDataSource = {
  listPresets(): Promise<McpServerPreset[]> {
    return window.api.mcp.listPresets().then(unwrap)
  },
  savePreset(preset: McpServerPreset): Promise<McpServerPreset[]> {
    return window.api.mcp.savePreset(preset).then(unwrap)
  },
  deletePreset(presetId: string): Promise<McpServerPreset[]> {
    return window.api.mcp.deletePreset(presetId).then(unwrap)
  },
  connect(presetId: string): Promise<McpSessionState> {
    return window.api.mcp.connect({ presetId }).then(unwrap)
  },
  disconnect(): Promise<McpSessionState> {
    return window.api.mcp.disconnect().then(unwrap)
  },
  getSessionState(): Promise<McpSessionState> {
    return window.api.mcp.getSessionState().then(unwrap)
  },
  listTools(): Promise<McpToolSummary[]> {
    return window.api.mcp.listTools().then(unwrap)
  },
  callTool(name: string, args?: Record<string, unknown>): Promise<McpToolCallResult> {
    return window.api.mcp.callTool({ name, arguments: args }).then(unwrap)
  },
  listPrompts(): Promise<McpPromptSummary[]> {
    return window.api.mcp.listPrompts().then(unwrap)
  },
  getPrompt(name: string, args?: Record<string, string>): Promise<McpPromptRenderResult> {
    return window.api.mcp.getPrompt({ name, arguments: args }).then(unwrap)
  },
  listResources(): Promise<McpResourceSummary[]> {
    return window.api.mcp.listResources().then(unwrap)
  },
  readResource(uri: string): Promise<McpResourceReadResult> {
    return window.api.mcp.readResource({ uri }).then(unwrap)
  },
  onSessionEvent(handler: (state: McpSessionState) => void): () => void {
    return window.api.mcp.onSessionEvent((event) => handler(event.state))
  },
  onTrace(handler: (event: McpTraceEvent) => void): () => void {
    return window.api.mcp.onTrace(handler)
  }
}
