import type {
  NormalChatAbortRequest,
  NormalChatSendMessageAccepted,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatConversationTurnDetail,
  NormalChatDeleteConversationTurnRequest,
  NormalChatGetConversationTurnDetailRequest,
  NormalChatGetConversationRequest,
  NormalChatSendMessageRequest
} from '@preload/types'
import { normalChatConversationMock } from './conversation.mock'

export interface NormalChatConversationDatasourceLike {
  getConversation(
    payload: NormalChatGetConversationRequest
  ): Promise<NormalChatConversationSnapshot>
  getConversationTurnDetail(
    payload: NormalChatGetConversationTurnDetailRequest
  ): Promise<NormalChatConversationTurnDetail | null>
  sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted>
  deleteConversationTurn(payload: NormalChatDeleteConversationTurnRequest): Promise<void>
  abort(payload: NormalChatAbortRequest): Promise<void>
  onStream(handler: (event: NormalChatConversationStreamEvent) => void): () => void
}

const defaultDatasource: NormalChatConversationDatasourceLike = {
  getConversation(payload) {
    // 临时重定向到 mock，先去掉 renderer 对 normal-chat IPC 的直接依赖。
    return normalChatConversationMock.getConversation(payload)
  },
  getConversationTurnDetail(payload) {
    return normalChatConversationMock.getConversationTurnDetail(payload)
  },
  sendMessage(payload) {
    return normalChatConversationMock.sendMessage(payload)
  },
  deleteConversationTurn(payload) {
    return normalChatConversationMock.deleteConversationTurn(payload)
  },
  abort(payload) {
    return normalChatConversationMock.abort(payload)
  },
  onStream(handler) {
    return normalChatConversationMock.onStream(handler)
  }
}

let datasource: NormalChatConversationDatasourceLike = defaultDatasource

export function setNormalChatConversationDatasourceForTesting(
  nextDatasource: NormalChatConversationDatasourceLike
): void {
  datasource = nextDatasource
}

export function resetNormalChatConversationDatasourceForTesting(): void {
  datasource = defaultDatasource
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
