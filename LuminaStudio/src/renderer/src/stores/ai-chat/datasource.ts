/**
 * AI Chat DataSource
 *
 * 负责 Renderer ↔ Preload API 之间的类型映射与数据转换
 */
import type {
  AiChatStartRequest,
  AiChatAbortRequest,
  AiChatHistoryRequest,
  AiChatStreamEvent,
  AiChatAgent,
  AiChatConversation,
  AiChatMessage,
  AiChatCreateAgentRequest,
  AiChatCreateConversationRequest
} from '@preload/types'
import type { AgentInfo, ConversationSummary, ChatMessage, ThinkingStep } from './types'

function mapReasoningToSteps(reasoning?: string | null): ThinkingStep[] | undefined {
  if (!reasoning) return undefined
  const lines = reasoning
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return undefined
  return lines.map((content, idx) => ({ id: `reasoning-${idx}`, content }))
}

function mapMessage(row: AiChatMessage): ChatMessage | null {
  if (row.role !== 'user' && row.role !== 'assistant') return null

  return {
    id: row.id,
    role: row.role,
    content: row.text ?? '',
    createdAt: row.createdAt,
    status: row.status,
    thinkingSteps: mapReasoningToSteps(row.reasoning),
    isStreaming: row.status === 'streaming',
    isThinking: false
  }
}

function mapAgent(row: AiChatAgent): AgentInfo {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null
  }
}

function mapConversation(row: AiChatConversation): ConversationSummary {
  return {
    id: row.id,
    agentId: row.agentId,
    title: row.title ?? null,
    providerId: row.providerId,
    modelId: row.modelId,
    updatedAt: row.updatedAt,
    messageCount: row.messageCount
  }
}

export const AiChatDataSource = {
  async startStream(
    request: AiChatStartRequest
  ): Promise<{ requestId: string; conversationId: string }> {
    const res = await window.api.aiChat.start(request)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to start stream')
    }
    return res.data
  },

  async abortStream(request: AiChatAbortRequest): Promise<void> {
    const res = await window.api.aiChat.abort(request)
    if (!res.success) {
      throw new Error(res.error || 'Failed to abort stream')
    }
  },

  async loadHistory(
    request: AiChatHistoryRequest
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    const res = await window.api.aiChat.history(request)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load history')
    }

    const mapped = (res.data.messages || []).map(mapMessage).filter(Boolean) as ChatMessage[]

    return {
      messages: mapped,
      total: res.data.total
    }
  },

  async listAgents(): Promise<AgentInfo[]> {
    const res = await window.api.aiChat.agents()
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load agents')
    }
    return res.data.map(mapAgent)
  },

  async listConversations(agentId: string): Promise<ConversationSummary[]> {
    const res = await window.api.aiChat.conversations({ agentId })
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load conversations')
    }
    return res.data.map(mapConversation)
  },

  async createAgent(request: AiChatCreateAgentRequest): Promise<AgentInfo> {
    const res = await window.api.aiChat.createAgent(request)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to create agent')
    }
    return mapAgent(res.data)
  },

  async createConversation(request: AiChatCreateConversationRequest): Promise<ConversationSummary> {
    const res = await window.api.aiChat.createConversation(request)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to create conversation')
    }
    return mapConversation(res.data)
  },

  subscribeStream(handler: (event: AiChatStreamEvent) => void): () => void {
    return window.api.aiChat.onStream(handler)
  }
}
