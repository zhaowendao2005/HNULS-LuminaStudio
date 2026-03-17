import type { ApiResponse } from './base.types'
import type { McpToolSummary } from './mcp.types'

export type McpChatMessageRole = 'system' | 'user' | 'assistant'

export interface McpChatMessage {
  id: string
  role: McpChatMessageRole
  text: string
  createdAt: string
}

export interface McpChatSession {
  id: string
  title: string
  providerId: string
  modelId: string
  memoryRounds: number
  enabledServerIds: string[]
  enabledToolKeys: string[]
  messages: McpChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface McpChatToolCatalogItem extends McpToolSummary {
  key: string
  serverId: string
}

export interface McpChatServerCatalogItem {
  id: string
  name: string
  transport: 'stdio' | 'streamable-http'
  status: 'connected' | 'error'
  serverName?: string | null
  serverVersion?: string | null
  error?: string
  tools: McpChatToolCatalogItem[]
}

export interface McpChatBootstrap {
  sessions: McpChatSession[]
  servers: McpChatServerCatalogItem[]
  settings: McpChatSettingsPayload
}

export interface McpChatSettingsPayload {
  memoryRoundsDefault: number
  enableAgentMode: boolean
  agentMaxRounds: number
}

export interface McpChatCreateSessionRequest {
  title?: string
  providerId: string
  modelId: string
  memoryRounds?: number
}

export interface McpChatUpdateSessionRequest {
  sessionId: string
  patch: Partial<
    Pick<
      McpChatSession,
      'title' | 'providerId' | 'modelId' | 'memoryRounds' | 'enabledServerIds' | 'enabledToolKeys'
    >
  >
}

export interface McpChatDeleteSessionRequest {
  sessionId: string
}

export interface McpChatSendMessageRequest {
  sessionId: string
  input: string
}

export interface McpChatAbortRequest {
  requestId: string
}

export interface McpChatSaveSettingsRequest {
  memoryRoundsDefault: number
  enableAgentMode: boolean
  agentMaxRounds: number
}

interface McpChatBaseEvent {
  requestId: string
  sessionId: string
}

export interface McpChatSessionSnapshotEvent {
  type: 'session-snapshot'
  session: McpChatSession
}

export interface McpChatStatusEvent extends McpChatBaseEvent {
  type: 'status'
  phase: 'planning' | 'tool-executing' | 'answering' | 'done'
  message: string
}

export interface McpChatAssistantChunkEvent extends McpChatBaseEvent {
  type: 'assistant-chunk'
  delta: string
}

export interface McpChatToolCallEvent extends McpChatBaseEvent {
  type: 'tool-call'
  toolKey: string
  toolName: string
  serverId: string
  arguments: Record<string, unknown>
}

export interface McpChatToolResultEvent extends McpChatBaseEvent {
  type: 'tool-result'
  toolKey: string
  toolName: string
  serverId: string
  result: unknown
  isError?: boolean
}

export interface McpChatRawJsonEvent extends McpChatBaseEvent {
  type: 'raw-json'
  label: string
  payload: unknown
}

export interface McpChatErrorEvent extends McpChatBaseEvent {
  type: 'error'
  message: string
}

export interface McpChatFinishEvent extends McpChatBaseEvent {
  type: 'finish'
  messageId: string
}

export type McpChatStreamEvent =
  | McpChatSessionSnapshotEvent
  | McpChatStatusEvent
  | McpChatAssistantChunkEvent
  | McpChatToolCallEvent
  | McpChatToolResultEvent
  | McpChatRawJsonEvent
  | McpChatErrorEvent
  | McpChatFinishEvent

export interface McpChatAPI {
  getBootstrap: () => Promise<ApiResponse<McpChatBootstrap>>
  refreshServers: () => Promise<ApiResponse<McpChatServerCatalogItem[]>>
  createSession: (request: McpChatCreateSessionRequest) => Promise<ApiResponse<McpChatSession>>
  updateSession: (request: McpChatUpdateSessionRequest) => Promise<ApiResponse<McpChatSession>>
  deleteSession: (request: McpChatDeleteSessionRequest) => Promise<ApiResponse<void>>
  sendMessage: (request: McpChatSendMessageRequest) => Promise<ApiResponse<{ requestId: string }>>
  abort: (request: McpChatAbortRequest) => Promise<ApiResponse<void>>
  saveSettings: (
    request: McpChatSaveSettingsRequest
  ) => Promise<ApiResponse<McpChatSettingsPayload>>
  onStream: (handler: (event: McpChatStreamEvent) => void) => () => void
}
