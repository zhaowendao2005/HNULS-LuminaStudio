import type {
  NormalChatAbortRequest,
  NormalChatSendMessageAccepted,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatRequestDebugSnapshot,
  NormalChatRequestEntry,
  NormalChatDeleteConversationTurnRequest,
  NormalChatGetConversationRequest,
  NormalChatSendMessageRequest,
  NormalChatTopicTranscriptSnapshot
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
  getTopicTranscript(payload: { topicId: string }): Promise<NormalChatTopicTranscriptSnapshot>
  getRequestDebugSnapshot(payload: { requestId: string }): Promise<NormalChatRequestDebugSnapshot>
  sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted>
  deleteConversationTurn(payload: NormalChatDeleteConversationTurnRequest): Promise<void>
  abort(payload: NormalChatAbortRequest): Promise<void>
  onStream(handler: (event: NormalChatConversationStreamEvent) => void): () => void
  onTopicTraceEntry(topicId: string, handler: (entry: NormalChatRequestEntry) => void): () => void
  onRequestTraceEntry(
    requestId: string,
    handler: (entry: NormalChatRequestEntry) => void
  ): () => void
}

const realDatasource: NormalChatConversationDatasourceLike = {
  getConversation(payload) {
    return window.api.normalChat.getConversation(payload).then(unwrap)
  },
  getTopicTranscript(payload) {
    return window.api.normalChat.getTopicTranscript(payload).then(unwrap)
  },
  getRequestDebugSnapshot(payload) {
    return window.api.normalChat.getRequestDebugSnapshot(payload).then(unwrap)
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
  },
  onTopicTraceEntry(topicId, handler) {
    return window.api.normalChat.onTopicTraceEntry(topicId, handler)
  },
  onRequestTraceEntry(requestId, handler) {
    return window.api.normalChat.onRequestTraceEntry(requestId, handler)
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
  getTopicTranscript(payload) {
    return datasource.getTopicTranscript(payload)
  },
  getRequestDebugSnapshot(payload) {
    return datasource.getRequestDebugSnapshot(payload)
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
  },
  onTopicTraceEntry(topicId, handler) {
    return datasource.onTopicTraceEntry(topicId, handler)
  },
  onRequestTraceEntry(requestId, handler) {
    return datasource.onRequestTraceEntry(requestId, handler)
  }
}
