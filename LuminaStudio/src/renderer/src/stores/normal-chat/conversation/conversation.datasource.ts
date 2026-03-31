import type {
  NormalChatAbortRequest,
  NormalChatSendMessageAccepted,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatTaskDetail,
  NormalChatDeleteConversationTurnRequest,
  NormalChatGetConversationTurnDetailRequest,
  NormalChatGetConversationRequest,
  NormalChatSendMessageRequest
} from '@preload/types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'Normal chat conversation request failed')
  }

  return response.data as T
}

export interface NormalChatConversationDatasourceLike {
  getConversation(
    payload: NormalChatGetConversationRequest
  ): Promise<NormalChatConversationSnapshot>
  getConversationTurnDetail(
    payload: NormalChatGetConversationTurnDetailRequest
  ): Promise<NormalChatTaskDetail | null>
  sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted>
  deleteConversationTurn(payload: NormalChatDeleteConversationTurnRequest): Promise<void>
  abort(payload: NormalChatAbortRequest): Promise<void>
  onStream(handler: (event: NormalChatConversationStreamEvent) => void): () => void
}

const realDatasource: NormalChatConversationDatasourceLike = {
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
    return window.api.normalChat.deleteConversationTurn(payload).then(unwrap)
  },
  abort(payload) {
    return window.api.normalChat.abort(payload).then(unwrap)
  },
  onStream(handler) {
    return window.api.normalChat.onStream(handler)
  }
}

let datasource: NormalChatConversationDatasourceLike = realDatasource

export function setNormalChatConversationDatasourceForTesting(
  nextDatasource: NormalChatConversationDatasourceLike
): void {
  datasource = nextDatasource
}

export function resetNormalChatConversationDatasourceForTesting(): void {
  datasource = realDatasource
}

export const NormalChatConversationDatasource: NormalChatConversationDatasourceLike = {
  getConversation(payload) {
    return datasource.getConversation(payload)
  },
  getConversationTurnDetail(payload) {
    return datasource.getConversationTurnDetail(payload)
  },
  sendMessage(payload) {
    return datasource.sendMessage(payload)
  },
  deleteConversationTurn(payload) {
    return datasource.deleteConversationTurn(payload)
  },
  abort(payload) {
    return datasource.abort(payload)
  },
  onStream(handler) {
    return datasource.onStream(handler)
  }
}
