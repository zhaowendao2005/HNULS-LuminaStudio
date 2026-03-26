import type {
  NormalChatConversationMessage,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatConversationTurnDetail,
  NormalChatSendMessageAccepted,
  NormalChatSendMessageRequest
} from '@preload/types'

interface PendingAssistantReply {
  requestId: string
  topicId: string
  timer: ReturnType<typeof setTimeout>
}

const listeners = new Set<(event: NormalChatConversationStreamEvent) => void>()
const messagesByTopicId = new Map<string, NormalChatConversationMessage[]>()
const pendingReplies = new Map<string, PendingAssistantReply>()

let messageCounter = 1
let requestCounter = 1

function cloneMessages(topicId: string): NormalChatConversationMessage[] {
  return structuredClone(messagesByTopicId.get(topicId) ?? [])
}

function emit(event: NormalChatConversationStreamEvent): void {
  listeners.forEach((listener) => listener(structuredClone(event)))
}

function appendMessage(topicId: string, message: NormalChatConversationMessage): void {
  const nextMessages = [...(messagesByTopicId.get(topicId) ?? []), message]
  messagesByTopicId.set(topicId, nextMessages)
}

function createMessage(
  topicId: string,
  requestId: string,
  role: 'user' | 'assistant',
  text: string
): NormalChatConversationMessage {
  const now = new Date().toISOString()
  const messageId = `message-mock-${messageCounter}`
  messageCounter += 1

  return {
    id: messageId,
    topicId,
    requestId,
    role,
    parts: [{ kind: 'text', text }],
    createdAt: now,
    updatedAt: now
  }
}

function scheduleAssistantReply(request: NormalChatSendMessageRequest, requestId: string): void {
  const timer = setTimeout(() => {
    pendingReplies.delete(requestId)

    const assistantMessage = createMessage(
      request.topicId,
      requestId,
      'assistant',
      `这是临时 mock 回复：${request.input}`
    )
    appendMessage(request.topicId, assistantMessage)

    emit({
      type: 'message-committed',
      requestId,
      topicId: request.topicId,
      message: assistantMessage
    })
    emit({
      type: 'finish',
      requestId,
      topicId: request.topicId,
      assistantMessageId: assistantMessage.id
    })
  }, 180)

  pendingReplies.set(requestId, {
    requestId,
    topicId: request.topicId,
    timer
  })
}

export function resetNormalChatConversationMockState(): void {
  pendingReplies.forEach((pending) => clearTimeout(pending.timer))
  pendingReplies.clear()
  messagesByTopicId.clear()
  listeners.clear()
  messageCounter = 1
  requestCounter = 1
}

export const normalChatConversationMock = {
  async getConversation(payload: { topicId: string }): Promise<NormalChatConversationSnapshot> {
    return {
      topicId: payload.topicId,
      messages: cloneMessages(payload.topicId)
    }
  },

  async getConversationTurnDetail(_payload: {
    requestId: string
  }): Promise<NormalChatConversationTurnDetail | null> {
    // 临时 mock 不维护完整 turn trace，详情面板走现有空态分支。
    return null
  },

  async sendMessage(
    payload: NormalChatSendMessageRequest
  ): Promise<NormalChatSendMessageAccepted> {
    const requestId = payload.clientRequestId || `request-mock-${requestCounter}`
    requestCounter += 1

    const userMessage = createMessage(payload.topicId, requestId, 'user', payload.input)
    appendMessage(payload.topicId, userMessage)
    scheduleAssistantReply(payload, requestId)

    return {
      requestId,
      message: structuredClone(userMessage)
    }
  },

  async deleteConversationTurn(payload: { requestId: string }): Promise<void> {
    messagesByTopicId.forEach((messages, topicId) => {
      const nextMessages = messages.filter((message) => message.requestId !== payload.requestId)
      messagesByTopicId.set(topicId, nextMessages)
    })
  },

  async abort(payload: { requestId: string }): Promise<void> {
    const pending = pendingReplies.get(payload.requestId)
    if (!pending) {
      return
    }

    clearTimeout(pending.timer)
    pendingReplies.delete(payload.requestId)

    emit({
      type: 'finish',
      requestId: pending.requestId,
      topicId: pending.topicId,
      assistantMessageId: null
    })
  },

  onStream(handler: (event: NormalChatConversationStreamEvent) => void): () => void {
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }
}
