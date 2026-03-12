/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Chat Message Store - 消息状态管理
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * 🎯 核心职责：
 * 1. 管理所有对话的消息列表
 * 2. 处理流式事件，动态构建/更新 ChatMessage
 * 3. 维护生成状态（isGenerating）
 *
 * 💡 核心设计：
 * - messagesByConversation: 以对话 ID 为 key，存储每个对话的消息列表
 * - streamContexts: 流式输出时，跟踪 requestId 对应的上下文信息
 * - Block 索引映射：快速定位到已存在的 Block 进行更新
 *
 * 🔄 流式输出流程：
 * 1. stream-start → 创建空消息，blocks = []
 * 2. text-delta → 追加/更新 TextBlock
 * 3. tool-call → 添加 ToolBlock
 * 4. tool-result → 更新 ToolBlock.result
 * 5. node-start → 添加 NodeBlock
 * 6. node-result → 更新 NodeBlock.result
 * 7. finish → 添加 MetaBlock，标记完成
 */
import { defineStore } from 'pinia'
import { ref, onScopeDispose } from 'vue'
import type { AiChatStreamEvent } from '@preload/types'
import type {
  LangchainClientNodeKind,
  UserInteractionRequestPayload
} from '@shared/langchain-client.types'
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

/**
 * StreamContext - 流式输出上下文
 *
 * 📌 作用：
 * 在流式输出过程中，跟踪当前正在构建的消息信息
 * 以及 Block 在数组中的索引位置，用于快速更新
 *
 * 🎯 为什么需要索引映射？
 * - 当后端发送 tool-result 时，需要找到之前的 tool-call 创建的 ToolBlock
 * - 直接遍历 blocks 效率低，用 Map 快速定位：O(1)
 *
 * 示例：
 * toolBlockIndexById.set('tool-123', 2)  // 表示 ID='tool-123' 的 ToolBlock 在 blocks[2]
 */
interface StreamContext {
  conversationId: string // 当前消息属于哪个对话
  messageId: string // 当前正在构建的消息 ID
  toolBlockIndexById: Map<string, number> // 工具调用 ID → Block 索引
  nodeBlockIndexById: Map<string, number> // 节点 ID → Block 索引
  thinkingBlockIndexById: Map<string, number> // 推理步骤 ID → Block 索引
}

export const useChatMessageStore = defineStore('chat-message', () => {
  // ==================== 状态 (State) ====================

  /**
   * 消息列表：按对话 ID 组织
   *
   * 结构：Map<conversationId, ChatMessage[]>
   * 示例：
   * {
   *   'conv-123': [
   *     { id: 'msg-1', role: 'user', blocks: [...] },
   *     { id: 'msg-2', role: 'assistant', blocks: [...] }
   *   ],
   *   'conv-456': [...]
   * }
   */
  const messagesByConversation = ref<Map<string, ChatMessage[]>>(new Map())

  /**
   * 是否正在生成回答
   * 用于 UI 显示加载状态
   */
  const isGenerating = ref(false)

  /**
   * 当前正在执行的请求 ID
   * 用于取消请求时匹配
   */
  const currentRequestId = ref<string | null>(null)

  /**
   * 流式输出上下文映射
   *
   * 结构：Map<requestId, StreamContext>
   * 作用：在流式输出过程中，根据 requestId 快速找到对应的消息和 Block
   */
  const streamContexts = new Map<string, StreamContext>()

  /**
   * 待处理的用户交互请求
   *
   * 结构：Map<nodeId, UserInteractionRequestPayload>
   * 当 graph 暂停等待用户输入时，payload 存放在这里，
   * 由 MessageComponents-UserInteraction.vue 消费并展示 UI。
   * 用户提交响应后从此 Map 中移除。
   */
  const pendingInteractions = ref<Map<string, UserInteractionRequestPayload>>(new Map())

  // ==================== 辅助函数 (Helpers) ====================

  /**
   * 确保对话的消息列表存在
   *
   * 如果对话还没有消息列表，创建一个空数组
   */
  const ensureConversationMessages = (conversationId: string): ChatMessage[] => {
    if (!messagesByConversation.value.has(conversationId)) {
      messagesByConversation.value.set(conversationId, [])
    }
    return messagesByConversation.value.get(conversationId)!
  }

  /**
   * 从 requestId 生成消息 ID
   *
   * 流式输出时使用临时 ID，完成后后端会返回数据库的真实 ID
   */
  const createMessageId = (requestId: string): string => `msg-${requestId}`

  /**
   * 获取当前流式输出的消息
   *
   * 根据 requestId 查找对应的 ChatMessage 对象
   */
  const getStreamMessage = (requestId: string): ChatMessage | null => {
    const ctx = streamContexts.get(requestId)
    if (!ctx) return null
    const list = messagesByConversation.value.get(ctx.conversationId) || []
    return list.find((m) => m.id === ctx.messageId) || null
  }

  /**
   * 获取流式输出上下文
   *
   * 包含 conversationId, messageId, 和 Block 索引映射
   */
  const getStreamContext = (requestId: string): StreamContext | null => {
    return streamContexts.get(requestId) || null
  }

  /**
   * 判断一个语义节点是否应该暴露成普通聊天里的可视化 Block。
   *
   * 这里要特别拦住 `planning`：
   * - `initial_planning` = 首轮规划，需要给用户看
   * - `planning` = 回环/继续规划，是 agent 内部继续推演步骤
   *
   * 如果不在这里拦住，NormalChat 会把 continue 轮次也渲染成
   * retrieval plan message block，导致触发范围超出预期。
   */
  const shouldExposeNodeBlock = (nodeKind: LangchainClientNodeKind): boolean => {
    return nodeKind !== 'planning'
  }

  /**
   * 确保消息有 blocks 数组
   *
   * 防御性编程，避免 blocks 为 undefined
   */
  const ensureBlocks = (msg: ChatMessage): MessageBlock[] => {
    if (!msg.blocks) msg.blocks = []
    return msg.blocks
  }

  /**
   * 追加文本增量 (delta)
   *
   * 💡 逻辑：
   * 1. 如果最后一个 Block 是 TextBlock → 直接追加内容
   * 2. 否则 → 创建新的 TextBlock
   *
   * 这样设计的好处：
   * - 避免创建大量微小的 TextBlock
   * - 保持文本连续性
   */
  const appendTextDelta = (msg: ChatMessage, delta: string): void => {
    const blocks = ensureBlocks(msg)
    const last = blocks[blocks.length - 1]
    // 如果最后一个 Block 是文本，直接追加
    if (last && last.type === 'text') {
      ;(last as TextBlock).content += delta
      return
    }
    // 否则创建新的 TextBlock
    blocks.push({ type: 'text', content: delta })
  }

  /**
   * 更新流式消息的 ID
   *
   * 📌 何时调用？
   * 流式输出完成后，后端会返回数据库保存的真实消息 ID
   * 需要替换掉之前的临时 ID
   */
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

  /**
   * 处理流式事件 - 核心函数
   *
   * 💡 这是整个 Store 最重要的函数！
   *
   * 🔄 工作流程：
   * 1. 接收后端发送的流式事件
   * 2. 根据事件类型，动态更新 ChatMessage 的 blocks 数组
   * 3. 维护 Block 索引映射，确保快速定位
   *
   * 📚 事件类型：
   * - stream-start: 开始流式输出，创建空消息
   * - text-delta: 文本增量，追加到 TextBlock
   * - reasoning-start/delta/end: 推理过程
   * - tool-call/result: 工具调用
   * - node-start/result/error: 节点执行
   * - error: 错误
   * - finish: 完成
   *
   * 🎯 关键设计：
   * - 使用 requestId 查找对应的消息
   * - 使用 Map 存储 Block 索引，实现 O(1) 更新
   * - 支持乱序事件：即使事件乱序到达，也能正确处理
   */
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
        const block: ThinkingBlock = {
          type: 'thinking',
          steps: [{ id: event.id, content: '' }],
          isThinking: true
        }
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
          const block: ThinkingBlock = {
            type: 'thinking',
            steps: [{ id: event.id, content: event.delta }],
            isThinking: true
          }
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
        if (!shouldExposeNodeBlock(event.payload.nodeKind)) break
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
        if (!shouldExposeNodeBlock(event.payload.nodeKind)) break
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

      case 'user-interaction-request': {
        // 将交互请求存入 pendingInteractions，供 UI 组件消费
        const payload = event.payload
        pendingInteractions.value.set(payload.nodeId, payload)
        break
      }

      case 'node-error': {
        if (!shouldExposeNodeBlock(event.payload.nodeKind)) break
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

  /**
   * 获取指定节点的 pending 交互请求
   */
  function getPendingInteraction(nodeId: string): UserInteractionRequestPayload | null {
    return pendingInteractions.value.get(nodeId) ?? null
  }

  /**
   * 清除指定节点的 pending 交互请求（用户提交后调用）
   */
  function clearPendingInteraction(nodeId: string): void {
    pendingInteractions.value.delete(nodeId)
  }

  return {
    // state
    messagesByConversation,
    isGenerating,
    currentRequestId,
    pendingInteractions,

    // actions
    getMessages,
    setMessages,
    addUserMessage,
    addTestMessage,
    startGenerating,
    stopGenerating,
    handleStreamEvent,
    getPendingInteraction,
    clearPendingInteraction
  }
})
