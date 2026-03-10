import type {
  McpChatStartResponse,
  McpPromptRenderResult,
  McpPromptSummary,
  McpResourceReadResult,
  McpResourceSummary,
  McpServerPreset,
  McpSessionState,
  McpToolCallResult,
  McpToolSummary,
  McpTraceEvent,
  McpChatStreamEvent
} from '@preload/types'

const MCP_PRESETS_STORAGE_KEY = 'lumina:mcp-presets'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'MCP request failed')
  }
  return response.data as T
}

function readLocalPresets(): McpServerPreset[] {
  const raw = window.localStorage.getItem(MCP_PRESETS_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as McpServerPreset[]) : []
  } catch {
    return []
  }
}

function writeLocalPresets(presets: McpServerPreset[]): void {
  window.localStorage.setItem(MCP_PRESETS_STORAGE_KEY, JSON.stringify(presets))
}

function toSerializablePreset(preset: McpServerPreset): McpServerPreset {
  return JSON.parse(JSON.stringify(preset)) as McpServerPreset
}

export const McpDataSource = {
  listPresets(): Promise<McpServerPreset[]> {
    return Promise.resolve(readLocalPresets())
  },
  savePreset(preset: McpServerPreset): Promise<McpServerPreset[]> {
    const serializablePreset = toSerializablePreset(preset)
    const next = readLocalPresets()
      .filter((item) => item.id !== serializablePreset.id)
      .concat(serializablePreset)
      .sort((a, b) => a.name.localeCompare(b.name))
    writeLocalPresets(next)
    return Promise.resolve(next)
  },
  deletePreset(presetId: string): Promise<McpServerPreset[]> {
    const next = readLocalPresets().filter((item) => item.id !== presetId)
    writeLocalPresets(next)
    return Promise.resolve(next)
  },
  connect(preset: McpServerPreset): Promise<McpSessionState> {
    return window.api.mcp.connect({ preset: toSerializablePreset(preset) }).then(unwrap)
  },
  disconnect(sessionId?: string): Promise<McpSessionState | null> {
    return window.api.mcp.disconnect({ sessionId }).then(unwrap)
  },
  getSessionState(sessionId?: string): Promise<McpSessionState | null> {
    return window.api.mcp.getSessionState({ sessionId }).then(unwrap)
  },
  listSessionStates(): Promise<McpSessionState[]> {
    return window.api.mcp.listSessionStates().then(unwrap)
  },
  listTools(sessionId: string): Promise<McpToolSummary[]> {
    return window.api.mcp.listTools({ sessionId }).then(unwrap)
  },
  callTool(
    sessionId: string,
    name: string,
    args?: Record<string, unknown>
  ): Promise<McpToolCallResult> {
    return window.api.mcp.callTool({ sessionId, name, arguments: args }).then(unwrap)
  },
  listPrompts(sessionId: string): Promise<McpPromptSummary[]> {
    return window.api.mcp.listPrompts({ sessionId }).then(unwrap)
  },
  getPrompt(
    sessionId: string,
    name: string,
    args?: Record<string, string>
  ): Promise<McpPromptRenderResult> {
    return window.api.mcp.getPrompt({ sessionId, name, arguments: args }).then(unwrap)
  },
  listResources(sessionId: string): Promise<McpResourceSummary[]> {
    return window.api.mcp.listResources({ sessionId }).then(unwrap)
  },
  readResource(sessionId: string, uri: string): Promise<McpResourceReadResult> {
    return window.api.mcp.readResource({ sessionId, uri }).then(unwrap)
  },
  startChat(request: {
    providerId: string
    modelId: string
    enableThinking?: boolean
    mcpEnabled: boolean
    sessionIds: string[]
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }): Promise<McpChatStartResponse> {
    return window.api.mcp.startChat(request).then(unwrap)
  },
  abortChat(requestId: string): Promise<void> {
    return window.api.mcp.abortChat({ requestId }).then(unwrap)
  },
  onSessionEvent(handler: (session: McpSessionState) => void): () => void {
    return window.api.mcp.onSessionEvent((event) => handler(event.state))
  },
  onTrace(handler: (event: McpTraceEvent) => void): () => void {
    return window.api.mcp.onTrace(handler)
  },
  onChatStream(handler: (event: McpChatStreamEvent) => void): () => void {
    return window.api.mcp.onChatStream(handler)
  }
}
