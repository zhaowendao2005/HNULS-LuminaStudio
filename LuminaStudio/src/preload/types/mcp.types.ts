import type { ApiResponse } from './base.types'

export type McpTransportType = 'stdio' | 'streamable-http'

export interface McpStdioPreset {
  id: string
  name: string
  transport: 'stdio'
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}

export interface McpStreamableHttpPreset {
  id: string
  name: string
  transport: 'streamable-http'
  url: string
  headers: Record<string, string>
}

export type McpServerPreset = McpStdioPreset | McpStreamableHttpPreset

export interface McpCapabilitiesSummary {
  tools: boolean
  prompts: boolean
  resources: boolean
  logging: boolean
}

export interface McpSessionState {
  connected: boolean
  presetId: string | null
  transport: McpTransportType | null
  serverName: string | null
  serverVersion: string | null
  protocolVersion: string | null
  capabilities: McpCapabilitiesSummary | null
  instructions?: string
  error?: string
}

export interface McpToolSummary {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

export interface McpPromptArgument {
  name: string
  description?: string
  required?: boolean
}

export interface McpPromptSummary {
  name: string
  description?: string
  arguments?: McpPromptArgument[]
}

export interface McpResourceSummary {
  uri: string
  name: string
  description?: string
  mimeType?: string
  size?: string
}

export interface McpPromptMessage {
  role: 'user' | 'assistant'
  content: unknown
}

export interface McpPromptRenderResult {
  description?: string
  messages: McpPromptMessage[]
}

export interface McpResourceContentItem {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

export interface McpResourceReadResult {
  contents: McpResourceContentItem[]
}

export interface McpToolCallResult {
  content: unknown[]
  structuredContent?: unknown
  isError?: boolean
}

export interface McpSessionEvent {
  type: 'session-state'
  state: McpSessionState
}

export interface McpTraceEvent {
  id: string
  direction: 'outgoing' | 'incoming'
  timestamp: string
  transport: McpTransportType | null
  payload: unknown
}

export interface McpConnectRequest {
  preset: McpServerPreset
}

export interface McpCallToolRequest {
  name: string
  arguments?: Record<string, unknown>
}

export interface McpGetPromptRequest {
  name: string
  arguments?: Record<string, string>
}

export interface McpReadResourceRequest {
  uri: string
}

export interface McpAPI {
  listPresets: () => Promise<ApiResponse<McpServerPreset[]>>
  savePreset: (preset: McpServerPreset) => Promise<ApiResponse<McpServerPreset[]>>
  deletePreset: (presetId: string) => Promise<ApiResponse<McpServerPreset[]>>
  connect: (request: McpConnectRequest) => Promise<ApiResponse<McpSessionState>>
  disconnect: () => Promise<ApiResponse<McpSessionState>>
  getSessionState: () => Promise<ApiResponse<McpSessionState>>
  listTools: () => Promise<ApiResponse<McpToolSummary[]>>
  callTool: (request: McpCallToolRequest) => Promise<ApiResponse<McpToolCallResult>>
  listPrompts: () => Promise<ApiResponse<McpPromptSummary[]>>
  getPrompt: (request: McpGetPromptRequest) => Promise<ApiResponse<McpPromptRenderResult>>
  listResources: () => Promise<ApiResponse<McpResourceSummary[]>>
  readResource: (request: McpReadResourceRequest) => Promise<ApiResponse<McpResourceReadResult>>
  onSessionEvent: (handler: (event: McpSessionEvent) => void) => () => void
  onTrace: (handler: (event: McpTraceEvent) => void) => () => void
}
