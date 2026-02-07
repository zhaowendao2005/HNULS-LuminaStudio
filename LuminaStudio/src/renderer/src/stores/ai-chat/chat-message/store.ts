/**
 * Chat Message Store
 *
 * 负责消息状态管理和流式事件处理
 */
import { defineStore } from 'pinia'
import { ref, onScopeDispose } from 'vue'
import type { AiChatStreamEvent } from '@preload/types'
import { ChatMessageDataSource } from './datasource'
import type {
  ChatMessage,
  MessageBlock,
  MetaBlock,
  NodeBlock,
  TextBlock,
  ThinkingBlock,
  ToolBlock
} from './types'

interface StreamContext {
  conversationId: string
  messageId: string
  toolBlockIndexById: Map<string, number>
  nodeBlockIndexById: Map<string, number>
  thinkingBlockIndexById: Map<string, number>
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

  const getStreamContext = (requestId: string): StreamContext | null => {
    return streamContexts.get(requestId) || null
  }

  const ensureBlocks = (msg: ChatMessage): MessageBlock[] => {
    if (!msg.blocks) msg.blocks = []
    return msg.blocks
  }

  const appendTextDelta = (msg: ChatMessage, delta: string): void => {
    const blocks = ensureBlocks(msg)
    const last = blocks[blocks.length - 1]
    if (last && last.type === 'text') {
      ;(last as TextBlock).content += delta
      return
    }
    blocks.push({ type: 'text', content: delta })
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
      blocks: [{ type: 'text', content }],
      status: 'final'
    }
    list.push(userMessage)
  }

  function addTestMessage(conversationId: string, data: any): void {
    const list = ensureConversationMessages(conversationId)
    const testMessage: ChatMessage = {
      id: `test-${Date.now()}`,
      role: 'test',
      blocks: [],
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
          messageId,
          toolBlockIndexById: new Map(),
          nodeBlockIndexById: new Map(),
          thinkingBlockIndexById: new Map()
        })

        const list = ensureConversationMessages(event.conversationId)
        list.push({
          id: messageId,
          role: 'assistant',
          blocks: [],
          isStreaming: true,
          status: 'streaming'
        })

        isGenerating.value = true
        currentRequestId.value = event.requestId
        break
      }

      case 'text-delta': {
        const msg = getStreamMessage(event.requestId)
        if (!msg) break
        appendTextDelta(msg, event.delta)
        break
      }

      case 'reasoning-start': {
        const msg = getStreamMessage(event.requestId)
        const ctx = getStreamContext(event.requestId)
        if (!msg) break
        const blocks = ensureBlocks(msg)
        const block: ThinkingBlock = { type: 'thinking', steps: [{ id: event.id, content: '' }], isThinking: true }
        blocks.push(block)
        if (ctx) {
          ctx.thinkingBlockIndexById.set(event.id, blocks.length - 1)
        }
        break
      }

      case 'reasoning-delta': {
        const msg = getStreamMessage(event.requestId)
        const ctx = getStreamContext(event.requestId)
        if (!msg) break
        const blocks = ensureBlocks(msg)
        const idx = ctx?.thinkingBlockIndexById.get(event.id)
        if (idx !== undefined && blocks[idx]?.type === 'thinking') {
          const block = blocks[idx] as ThinkingBlock
          const step = block.steps.find((s) => s.id === event.id)
          if (step) step.content += event.delta
          else block.steps.push({ id: event.id, content: event.delta })
        } else {
          const block: ThinkingBlock = { type: 'thinking', steps: [{ id: event.id, content: event.delta }], isThinking: true }
          blocks.push(block)
          ctx?.thinkingBlockIndexById.set(event.id, blocks.length - 1)
        }
        break
      }

      case 'reasoning-end': {
        const msg = getStreamMessage(event.requestId)
        const ctx = getStreamContext(event.requestId)
        if (!msg) break
        const blocks = ensureBlocks(msg)
        const idx = ctx?.thinkingBlockIndexById.get(event.id)
        if (idx !== undefined && blocks[idx]?.type === 'thinking') {
          ;(blocks[idx] as ThinkingBlock).isThinking = false
        }
        break
      }

      case 'tool-call': {
        const msg = getStreamMessage(event.requestId)
        const ctx = getStreamContext(event.requestId)
        if (!msg) break
        const blocks = ensureBlocks(msg)
        const block: ToolBlock = { type: 'tool', call: event.payload }
        blocks.push(block)
        ctx?.toolBlockIndexById.set(event.payload.toolCallId, blocks.length - 1)
        break
      }

      case 'tool-call-delta': {
        const msg = getStreamMessage(event.requestId)
        const ctx = getStreamContext(event.requestId)
        if (!msg) break
        const blocks = ensureBlocks(msg)
        const idx = ctx?.toolBlockIndexById.get(event.toolCallId)
        if (idx !== undefined && blocks[idx]?.type === 'tool') {
          const block = blocks[idx] as ToolBlock
          block.argsText = (block.argsText || '') + event.argsTextDelta
        } else {
          const block: ToolBlock = {
            type: 'tool',
            call: { toolCallId: event.toolCallId, toolName: event.toolName, toolArgs: {} },
            argsText: event.argsTextDelta
          }
          blocks.push(block)
          ctx?.toolBlockIndexById.set(event.toolCallId, blocks.length - 1)
        }
        break
      }

      case 'tool-result': {
        const msg = getStreamMessage(event.requestId)
        const ctx = getStreamContext(event.requestId)
        if (!msg) break
        const blocks = ensureBlocks(msg)
        const idx = ctx?.toolBlockIndexById.get(event.payload.toolCallId)
        if (idx !== undefined && blocks[idx]?.type === 'tool') {
          ;(blocks[idx] as ToolBlock).result = event.payload.result
        } else {
          const block: ToolBlock = {
            type: 'tool',
            call: {
              toolCallId: event.payload.toolCallId,
              toolName: event.payload.toolName,
              toolArgs: {}
            },
            result: event.payload.result
          }
          blocks.push(block)
          ctx?.toolBlockIndexById.set(event.payload.toolCallId, blocks.length - 1)
        }
        break
      }

      case 'node-start': {
        const msg = getStreamMessage(event.requestId)
        const ctx = getStreamContext(event.requestId)
        if (!msg) break
        const blocks = ensureBlocks(msg)
        const block: NodeBlock = { type: 'node', start: event.payload }
        blocks.push(block)
        ctx?.nodeBlockIndexById.set(event.payload.nodeId, blocks.length - 1)
        break
      }

      case 'node-result': {
        const msg = getStreamMessage(event.requestId)
        const ctx = getStreamContext(event.requestId)
        if (!msg) break
        const blocks = ensureBlocks(msg)
        const idx = ctx?.nodeBlockIndexById.get(event.payload.nodeId)
        if (idx !== undefined && blocks[idx]?.type === 'node') {
          ;(blocks[idx] as NodeBlock).result = event.payload
        } else {
          const block: NodeBlock = { type: 'node', start: event.payload, result: event.payload }
          blocks.push(block)
          ctx?.nodeBlockIndexById.set(event.payload.nodeId, blocks.length - 1)
        }
        break
      }

      case 'node-error': {
        const msg = getStreamMessage(event.requestId)
        const ctx = getStreamContext(event.requestId)
        if (!msg) break
        const blocks = ensureBlocks(msg)
        const idx = ctx?.nodeBlockIndexById.get(event.payload.nodeId)
        if (idx !== undefined && blocks[idx]?.type === 'node') {
          ;(blocks[idx] as NodeBlock).error = event.payload
        } else {
          const block: NodeBlock = { type: 'node', start: event.payload, error: event.payload }
          blocks.push(block)
          ctx?.nodeBlockIndexById.set(event.payload.nodeId, blocks.length - 1)
        }
        break
      }

      case 'error': {
        const msg = getStreamMessage(event.requestId)
        if (msg) {
          msg.isStreaming = false
          msg.status = 'error'
          appendTextDelta(msg, `\n\n[Error] ${event.message}`)
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
          if (event.usage) {
            const block: MetaBlock = { type: 'meta', usage: event.usage }
            ensureBlocks(msg).push(block)
          }
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
