import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AiChatDataSource } from './datasource'
import type { AgentInfo, ChatMessage, ConversationSummary } from './types'
import { useChatMessageStore } from './chat-message/store'

export const useAiChatStore = defineStore('ai-chat', () => {
  // ===== Chat Message Store =====
  const messageStore = useChatMessageStore()

  // ===== State =====
  const agents = ref<AgentInfo[]>([])
  const conversationsByAgent = ref<Record<string, ConversationSummary[]>>({})

  const currentAgentId = ref<string | null>(null)
  const currentConversationId = ref<string | null>(null)

  const currentProviderId = ref<string | null>(null)
  const currentModelId = ref<string | null>(null)
  const enableThinking = ref(false)

  // ===== Computed =====
  const currentMessages = computed<ChatMessage[]>(() => {
    if (!currentConversationId.value) return []
    return messageStore.getMessages(currentConversationId.value)
  })

  const isGenerating = computed(() => messageStore.isGenerating.value)

  const currentConversations = computed<ConversationSummary[]>(() => {
    if (!currentAgentId.value) return []
    return conversationsByAgent.value[currentAgentId.value] || []
  })

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
  }

  async function switchConversation(conversationId: string): Promise<void> {
    currentConversationId.value = conversationId
    const res = await AiChatDataSource.loadHistory({
      conversationId,
      limit: 200,
      offset: 0
    })
    messageStore.setMessages(conversationId, res.messages)

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

    messageStore.addUserMessage(conversationId, input)

    const startRes = await AiChatDataSource.startStream({
      conversationId,
      agentId: currentAgentId.value,
      providerId: currentProviderId.value,
      modelId: currentModelId.value,
      input,
      enableThinking: enableThinking.value
    })

    messageStore.startGenerating(startRes.requestId)
  }

  async function abortGeneration(): Promise<void> {
    if (!messageStore.currentRequestId.value) return
    await AiChatDataSource.abortStream({ requestId: messageStore.currentRequestId.value })
  }

  function setCurrentModel(providerId: string, modelId: string): void {
    currentProviderId.value = providerId
    currentModelId.value = modelId
  }

  function setThinkingEnabled(value: boolean): void {
    enableThinking.value = value
  }

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
