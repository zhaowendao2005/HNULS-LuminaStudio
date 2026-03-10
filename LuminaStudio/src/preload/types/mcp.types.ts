import type { ApiResponse } from './base.types'
import type { AiChatStreamEvent } from './ai-chat.types'

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
  sessionId: string
  connected: boolean
  presetId: string | null
  presetName?: string | null
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
  sessionId: string
  direction: 'outgoing' | 'incoming'
  timestamp: string
  transport: McpTransportType | null
  payload: unknown
}

export interface McpConnectRequest {
  preset: McpServerPreset
}

export interface McpDisconnectRequest {
  sessionId?: string
}

export interface McpSessionScopedRequest {
  sessionId: string
}

export interface McpCallToolRequest extends McpSessionScopedRequest {
  name: string
  arguments?: Record<string, unknown>
}

export interface McpGetPromptRequest extends McpSessionScopedRequest {
  name: string
  arguments?: Record<string, string>
}

export interface McpReadResourceRequest extends McpSessionScopedRequest {
  uri: string
}

export interface McpChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface McpChatStartRequest {
  requestId?: string
  providerId: string
  modelId: string
  enableThinking?: boolean
  mcpEnabled: boolean
  sessionIds: string[]
  messages: McpChatMessage[]
}

export interface McpChatStartResponse {
  requestId: string
}

export interface McpChatAbortRequest {
  requestId: string
}

export type McpChatStreamEvent = AiChatStreamEvent

export interface McpAPI {
  listPresets: () => Promise<ApiResponse<McpServerPreset[]>>
  savePreset: (preset: McpServerPreset) => Promise<ApiResponse<McpServerPreset[]>>
  deletePreset: (presetId: string) => Promise<ApiResponse<McpServerPreset[]>>
  connect: (request: McpConnectRequest) => Promise<ApiResponse<McpSessionState>>
  disconnect: (request?: McpDisconnectRequest) => Promise<ApiResponse<McpSessionState | null>>
  getSessionState: (request?: McpDisconnectRequest) => Promise<ApiResponse<McpSessionState | null>>
  listSessionStates: () => Promise<ApiResponse<McpSessionState[]>>
  listTools: (request: McpSessionScopedRequest) => Promise<ApiResponse<McpToolSummary[]>>
  callTool: (request: McpCallToolRequest) => Promise<ApiResponse<McpToolCallResult>>
  listPrompts: (request: McpSessionScopedRequest) => Promise<ApiResponse<McpPromptSummary[]>>
  getPrompt: (request: McpGetPromptRequest) => Promise<ApiResponse<McpPromptRenderResult>>
  listResources: (request: McpSessionScopedRequest) => Promise<ApiResponse<McpResourceSummary[]>>
  readResource: (request: McpReadResourceRequest) => Promise<ApiResponse<McpResourceReadResult>>
  startChat: (request: McpChatStartRequest) => Promise<ApiResponse<McpChatStartResponse>>
  abortChat: (request: McpChatAbortRequest) => Promise<ApiResponse<void>>
  onSessionEvent: (handler: (event: McpSessionEvent) => void) => () => void
  onTrace: (handler: (event: McpTraceEvent) => void) => () => void
  onChatStream: (handler: (event: McpChatStreamEvent) => void) => () => void
}
