import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref } from 'vue'
import type { AiChatStreamEvent } from '@preload/types'
import { AiChatDataSource } from './datasource'
import type { AgentInfo, ChatMessage, ConversationSummary, ToolCallResult } from './types'

interface StreamContext {
  conversationId: string
  messageId: string
}

export const useAiChatStore = defineStore('ai-chat', () => {
  // ===== State =====
  const agents = ref<AgentInfo[]>([])
  const conversationsByAgent = ref<Record<string, ConversationSummary[]>>({})

  const currentAgentId = ref<string | null>(null)
  const currentConversationId = ref<string | null>(null)

  const messagesByConversation = ref<Map<string, ChatMessage[]>>(new Map())

  const isGenerating = ref(false)
  const currentRequestId = ref<string | null>(null)

  const currentProviderId = ref<string | null>(null)
  const currentModelId = ref<string | null>(null)
  const enableThinking = ref(false)

  // stream context: requestId -> conversationId/messageId
  const streamContexts = new Map<string, StreamContext>()

  // ===== Computed =====
  const currentMessages = computed<ChatMessage[]>(() => {
    if (!currentConversationId.value) return []
    return messagesByConversation.value.get(currentConversationId.value) || []
  })

  const currentConversations = computed<ConversationSummary[]>(() => {
    if (!currentAgentId.value) return []
    return conversationsByAgent.value[currentAgentId.value] || []
  })

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
  async function loadAgents(): Promise<void> {
    agents.value = await AiChatDataSource.listAgents()
    if (!currentAgentId.value && agents.value.length > 0) {
      currentAgentId.value = agents.value[0].id
    }
  }

  async function selectAgent(agentId: string): Promise<void> {
    currentAgentId.value = agentId
    await loadConversations(agentId)
  }

  async function loadConversations(agentId: string): Promise<void> {
    const list = await AiChatDataSource.listConversations(agentId)
    conversationsByAgent.value = {
      ...conversationsByAgent.value,
      [agentId]: list
    }
  }

  async function createAgent(name: string, description?: string | null): Promise<void> {
    const agent = await AiChatDataSource.createAgent({ name, description })
    agents.value = [...agents.value, agent]
    currentAgentId.value = agent.id
    conversationsByAgent.value = { ...conversationsByAgent.value, [agent.id]: [] }
    currentConversationId.value = null
  }

  async function createConversation(payload: {
    agentId: string
    title?: string | null
    providerId: string
    modelId: string
    enableThinking?: boolean
  }): Promise<void> {
    const conversation = await AiChatDataSource.createConversation(payload)
    await loadConversations(payload.agentId)
    currentConversationId.value = conversation.id
    currentProviderId.value = payload.providerId
    currentModelId.value = payload.modelId
    ensureConversationMessages(conversation.id)
  }

  async function switchConversation(conversationId: string): Promise<void> {
    currentConversationId.value = conversationId
    const res = await AiChatDataSource.loadHistory({
      conversationId,
      limit: 200,
      offset: 0
    })
    messagesByConversation.value.set(conversationId, res.messages)

    // 同步当前对话的模型信息
    const currentList = currentConversations.value
    const conv = currentList.find((c) => c.id === conversationId)
    if (conv) {
      currentProviderId.value = conv.providerId
      currentModelId.value = conv.modelId
    }
  }

  async function sendMessage(input: string): Promise<void> {
    if (!input.trim()) return

    if (!currentAgentId.value) {
      await loadAgents()
    }

    if (!currentAgentId.value) {
      throw new Error('No agent available')
    }

    if (!currentProviderId.value || !currentModelId.value) {
      throw new Error('Model is not selected')
    }
    let conversationId = currentConversationId.value
    if (!conversationId) {
      await createConversation({
        agentId: currentAgentId.value,
        providerId: currentProviderId.value,
        modelId: currentModelId.value,
        enableThinking: enableThinking.value
      })
      conversationId = currentConversationId.value
    }

    if (!conversationId) {
      throw new Error('Conversation is not available')
    }
    currentConversationId.value = conversationId

    const list = ensureConversationMessages(conversationId)
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      status: 'final'
    }
    list.push(userMessage)

    isGenerating.value = true

    const startRes = await AiChatDataSource.startStream({
      conversationId,
      agentId: currentAgentId.value,
      providerId: currentProviderId.value,
      modelId: currentModelId.value,
      input,
      enableThinking: enableThinking.value
    })

    currentRequestId.value = startRes.requestId
  }

  async function abortGeneration(): Promise<void> {
    if (!currentRequestId.value) return
    await AiChatDataSource.abortStream({ requestId: currentRequestId.value })
  }

  function setCurrentModel(providerId: string, modelId: string): void {
    currentProviderId.value = providerId
    currentModelId.value = modelId
  }

  function setThinkingEnabled(value: boolean): void {
    enableThinking.value = value
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
  const unsubscribe = AiChatDataSource.subscribeStream(handleStreamEvent)
  onScopeDispose(() => {
    unsubscribe()
  })

  return {
    // state
    agents,
    currentAgentId,
    conversationsByAgent,
    currentConversationId,
    currentProviderId,
    currentModelId,
    enableThinking,
    isGenerating,
    currentRequestId,

    // computed
    currentMessages,
    currentConversations,

    // actions
    loadAgents,
    selectAgent,
    loadConversations,
    createAgent,
    createConversation,
    switchConversation,
    sendMessage,
    abortGeneration,
    setCurrentModel,
    setThinkingEnabled
  }
})
