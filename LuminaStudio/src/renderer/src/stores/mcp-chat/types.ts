import type { McpChatMessage, McpChatServerCatalogItem, McpChatSession } from '@preload/types'

export interface McpChatRawEntry {
  id: string
  label: string
  payload: unknown
  createdAt: string
}

export interface McpChatRuntimeState {
  sessions: McpChatSession[]
  servers: McpChatServerCatalogItem[]
  selectedSessionId: string | null
  pendingAssistantTextBySession: Record<string, string>
  rawEntriesBySession: Record<string, McpChatRawEntry[]>
  currentRequestId: string | null
  statusText: string
  memoryRoundsDefault: number
  enableAgentMode: boolean
  agentMaxRounds: number
  rightPanelWidth: number
  activeTab: 'tools' | 'raw-json' | 'settings'
  loading: boolean
  error: string | null
}

export interface McpChatSessionViewModel extends McpChatSession {
  pendingAssistantText: string
  rawEntries: McpChatRawEntry[]
  displayMessages: McpChatMessage[]
}
