import type {
  NormalChatAbortRequest,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
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
  sendMessage(
    payload: NormalChatSendMessageRequest
  ): Promise<{ requestId: string; messageId: string }>
  abort(payload: NormalChatAbortRequest): Promise<void>
  onStream(handler: (event: NormalChatConversationStreamEvent) => void): () => void
}

export const NormalChatConversationDatasource: NormalChatConversationDatasourceLike = {
  getConversation(payload) {
    return window.api.normalChat.getConversation(payload).then(unwrap)
  },
  sendMessage(payload) {
    return window.api.normalChat.sendMessage(payload).then(unwrap)
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
