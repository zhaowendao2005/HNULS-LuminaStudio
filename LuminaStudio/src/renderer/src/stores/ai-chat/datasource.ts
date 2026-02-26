/**
 * AI Chat DataSource
 *
 * 负责 Renderer ↔ Preload API 之间的类型映射与数据转换
 */
import type {
  AiChatStartRequest,
  AiChatAbortRequest,
  AiChatHistoryRequest,
  AiChatAgent,
  AiChatConversation,
  AiChatCreateAgentRequest,
  AiChatCreateConversationRequest
} from '@preload/types'
import type { AgentInfo, ConversationSummary, ChatMessage } from './types'
import { mapMessage } from './chat-message/datasource'

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

  async deleteConversation(conversationId: string): Promise<void> {
    const res = await window.api.aiChat.deleteConversation({ conversationId })
    if (!res.success) {
      throw new Error(res.error || 'Failed to delete conversation')
    }
  },

  async deleteAgent(agentId: string): Promise<void> {
    const res = await window.api.aiChat.deleteAgent({ agentId })
    if (!res.success) {
      throw new Error(res.error || 'Failed to delete agent')
    }
  }
}
