/**
 * Chat Message Store
 *
 * 负责消息状态管理和流式事件处理
 */
import { defineStore } from 'pinia'
import { ref, onScopeDispose } from 'vue'
import type { AiChatStreamEvent } from '@preload/types'
import { ChatMessageDataSource } from './datasource'
import type { ChatMessage, ToolCallResult } from './types'

interface StreamContext {
  conversationId: string
  messageId: string
}

export const useChatMessageStore = defineStore('chat-message', () => {
  // ===== State =====
  const messagesByConversation = ref<Map<string, ChatMessage[]>>(new Map())
  const isGenerating = ref(false)
  const currentRequestId = ref<string | null>(null)

  // stream context: requestId -> conversationId/messageId
  const streamContexts = new Map<string, StreamContext>()

  // ===== Helpers =====
  const ensureConversationMessages = (conversationId: string): ChatMessage[] => {
    if (!messagesByConversation.value.has(conversationId)) {
      messagesByConversation.value.set(conversationId, [])
    }
    return messagesByConversation.value.get(conversationId)!
  }

  const createMessageId = (requestId: string): string => `msg-${requestId}`

  const getStreamMessage = (requestId: string): ChatMessage | null => {
    const ctx = streamContexts.get(requestId)
    if (!ctx) return null
    const list = messagesByConversation.value.get(ctx.conversationId) || []
    return list.find((m) => m.id === ctx.messageId) || null
  }

  const updateStreamMessageId = (requestId: string, newId: string) => {
    const ctx = streamContexts.get(requestId)
    if (!ctx) return
    const list = messagesByConversation.value.get(ctx.conversationId) || []
    const msg = list.find((m) => m.id === ctx.messageId)
    if (!msg) return
    msg.id = newId
    ctx.messageId = newId
  }

  // ===== Actions =====
  function getMessages(conversationId: string): ChatMessage[] {
    return messagesByConversation.value.get(conversationId) || []
  }

  function setMessages(conversationId: string, messages: ChatMessage[]): void {
    messagesByConversation.value.set(conversationId, messages)
  }

  function addUserMessage(conversationId: string, content: string): void {
    const list = ensureConversationMessages(conversationId)
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      status: 'final'
    }
    list.push(userMessage)
  }

  function addTestMessage(conversationId: string, data: any): void {
    const list = ensureConversationMessages(conversationId)
    const testMessage: ChatMessage = {
      id: `test-${Date.now()}`,
      role: 'test',
      content: '',
      rawData: data,
      status: 'final'
    }
    list.push(testMessage)
  }

  function startGenerating(requestId: string): void {
    isGenerating.value = true
    currentRequestId.value = requestId
  }

  function stopGenerating(): void {
    isGenerating.value = false
    currentRequestId.value = null
  }

  function handleStreamEvent(event: AiChatStreamEvent): void {
    switch (event.type) {
      case 'stream-start': {
        const messageId = createMessageId(event.requestId)
        streamContexts.set(event.requestId, {
          conversationId: event.conversationId,
          messageId
        })

        const list = ensureConversationMessages(event.conversationId)
        list.push({
          id: messageId,
          role: 'assistant',
          content: '',
          isStreaming: true,
          isThinking: false,
          thinkingSteps: [],
          toolCalls: []
        })

        isGenerating.value = true
        currentRequestId.value = event.requestId
        break
      }

      case 'text-delta': {
        const msg = getStreamMessage(event.requestId)
        if (!msg) break
        msg.content += event.delta
        break
      }

      case 'reasoning-start': {
        const msg = getStreamMessage(event.requestId)
        if (!msg) break
        msg.isThinking = true
        msg.thinkingSteps = msg.thinkingSteps || []
        msg.thinkingSteps.push({ id: event.id, content: '' })
        break
      }

      case 'reasoning-delta': {
        const msg = getStreamMessage(event.requestId)
        if (!msg) break
        msg.thinkingSteps = msg.thinkingSteps || []
        const step = msg.thinkingSteps.find((s) => s.id === event.id)
        if (step) {
          step.content += event.delta
        } else {
          msg.thinkingSteps.push({ id: event.id, content: event.delta })
        }
        break
      }

      case 'reasoning-end': {
        const msg = getStreamMessage(event.requestId)
        if (!msg) break
        msg.isThinking = false
        break
      }

      case 'tool-call': {
        const msg = getStreamMessage(event.requestId)
        if (!msg) break
        msg.toolCalls = msg.toolCalls || []
        msg.toolCalls.push({
          id: event.toolCallId,
          name: event.toolName,
          input: event.input
        })
        break
      }

      case 'tool-call-delta': {
        const msg = getStreamMessage(event.requestId)
        if (!msg) break
        msg.toolCalls = msg.toolCalls || []
        const call = msg.toolCalls.find((c) => c.id === event.toolCallId)
        if (call) {
          call.argsText = (call.argsText || '') + event.argsTextDelta
        } else {
          msg.toolCalls.push({
            id: event.toolCallId,
            name: event.toolName,
            input: {},
            argsText: event.argsTextDelta
          })
        }
        break
      }

      case 'tool-result': {
        const msg = getStreamMessage(event.requestId)
        if (!msg) break
        msg.toolCalls = msg.toolCalls || []
        const call = msg.toolCalls.find((c) => c.id === event.toolCallId)
        if (call) {
          call.result = event.result as ToolCallResult
        }
        break
      }

      case 'error': {
        const msg = getStreamMessage(event.requestId)
        if (msg) {
          msg.isStreaming = false
          msg.status = 'error'
          msg.content += `\n\n[Error] ${event.message}`
        }
        isGenerating.value = false
        currentRequestId.value = null
        break
      }

      case 'finish': {
        const msg = getStreamMessage(event.requestId)
        if (msg) {
          msg.isStreaming = false
          msg.status = event.finishReason === 'stop' ? 'final' : 'aborted'
          msg.usage = event.usage
        }
        if (event.messageId) {
          updateStreamMessageId(event.requestId, event.messageId)
        }
        isGenerating.value = false
        currentRequestId.value = null
        break
      }

      default:
        break
    }
  }

  // 订阅流式事件（仅一次）
  const unsubscribe = ChatMessageDataSource.subscribeStream(handleStreamEvent)
  onScopeDispose(() => {
    unsubscribe()
  })

  return {
    // state
    messagesByConversation,
    isGenerating,
    currentRequestId,

    // actions
    getMessages,
    setMessages,
    addUserMessage,
    addTestMessage,
    startGenerating,
    stopGenerating,
    handleStreamEvent
  }
})
