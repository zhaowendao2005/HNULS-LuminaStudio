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

const MCP_PRESETS_STORAGE_KEY = 'lumina:mcp-presets'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || 'MCP request failed')
  }
  return response.data
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
