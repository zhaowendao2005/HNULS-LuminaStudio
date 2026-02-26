/**
 * AI Chat DataSource
 *
 * 负责 Renderer ↔ Preload API 之间的类型映射与数据转换
 */
import type {
  AiChatStartRequest,
  AiChatAbortRequest,
  AiChatHistoryRequest,
  AiChatPreset,
  AiChatConversation,
  AiChatCreatePresetRequest,
  AiChatCreateConversationRequest
} from '@preload/types'
import type { AgentInfo, ConversationSummary, ChatMessage } from './types'
import { mapMessage } from './chat-message/datasource'

function mapPreset(row: AiChatPreset): AgentInfo {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null
  }
}

function mapConversation(row: AiChatConversation): ConversationSummary {
  return {
    id: row.id,
    presetId: row.presetId,
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

  async listPresets(): Promise<AgentInfo[]> {
    const res = await window.api.aiChat.presets()
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load presets')
    }
    return res.data.map(mapPreset)
  },

  async listConversations(presetId: string): Promise<ConversationSummary[]> {
    const res = await window.api.aiChat.conversations({ presetId })
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to load conversations')
    }
    return res.data.map(mapConversation)
  },

  async createPreset(request: AiChatCreatePresetRequest): Promise<AgentInfo> {
    const res = await window.api.aiChat.createPreset(request)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to create preset')
    }
    return mapPreset(res.data)
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

  async deletePreset(presetId: string): Promise<void> {
    const res = await window.api.aiChat.deletePreset({ presetId })
    if (!res.success) {
      throw new Error(res.error || 'Failed to delete preset')
    }
  }
}
