import type {
  NormalChatAbortRequest,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatConversationTurnDetail,
  NormalChatDeleteConversationTurnRequest,
  NormalChatGetConversationTurnDetailRequest,
  NormalChatGetConversationRequest,
  NormalChatSendMessageRequest
} from '@preload/types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || 'Normal Chat conversation request failed')
  }

  return response.data
}

export interface NormalChatConversationDatasourceLike {
  getConversation(
    payload: NormalChatGetConversationRequest
  ): Promise<NormalChatConversationSnapshot>
  getConversationTurnDetail(
    payload: NormalChatGetConversationTurnDetailRequest
  ): Promise<NormalChatConversationTurnDetail | null>
  sendMessage(
    payload: NormalChatSendMessageRequest
  ): Promise<{ requestId: string; messageId: string }>
  deleteConversationTurn(payload: NormalChatDeleteConversationTurnRequest): Promise<void>
  abort(payload: NormalChatAbortRequest): Promise<void>
  onStream(handler: (event: NormalChatConversationStreamEvent) => void): () => void
}

export const NormalChatConversationDatasource: NormalChatConversationDatasourceLike = {
  getConversation(payload) {
    return window.api.normalChat.getConversation(payload).then(unwrap)
  },
  getConversationTurnDetail(payload) {
    return window.api.normalChat.getConversationTurnDetail(payload).then(unwrap)
  },
  sendMessage(payload) {
    return window.api.normalChat.sendMessage(payload).then(unwrap)
  },
  deleteConversationTurn(payload) {
    return window.api.normalChat.deleteConversationTurn(payload).then((response) => {
      if (!response.success) {
        throw new Error(response.error || 'Normal Chat delete conversation request failed')
      }
    })
  },
  abort(payload) {
    return window.api.normalChat.abort(payload).then((response) => {
      if (!response.success) {
        throw new Error(response.error || 'Normal Chat abort request failed')
      }
    })
  },
  onStream(handler) {
    return window.api.normalChat.onStream(handler)
  }
}
