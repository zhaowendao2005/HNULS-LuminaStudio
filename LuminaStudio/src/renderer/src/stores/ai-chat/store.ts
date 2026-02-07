import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AiChatDataSource } from './datasource'
import type { AgentInfo, ChatMessage, ConversationSummary } from './types'
import { useChatMessageStore } from './chat-message/store'
import { useInputBarStore } from './input-bar.store'
import { useSourcesStore } from './sources.store'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import type { AiChatRetrievalConfig, AiChatRetrievalScope } from '@preload/types'
import { useKnowledgeQaConfigStore } from '@renderer/stores/ai-chat/LangchainAgent-Config/knowledge-qa'
import type { KnowledgeQaModelConfig } from '@shared/langchain-client.types'

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

  // Pinia setup-store unwraps refs on the store instance
  const isGenerating = computed(() => messageStore.isGenerating)

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

  function safeVectorTableName(configId: string, dimensions: number): string {
    const safeId = String(configId).replace(/[^a-zA-Z0-9_]/g, '_')
    return `emb_cfg_${safeId}_${dimensions}_chunks`
  }

  function buildRetrievalConfigFromSources(): AiChatRetrievalConfig | undefined {
    const sourcesStore = useSourcesStore()
    const selected = sourcesStore.selectedDocuments

    if (!selected || selected.length === 0) return undefined

    // group by kbId + configId + dimensions
    const scopeMap = new Map<string, AiChatRetrievalScope>()

    for (const item of selected) {
      const kbId = item.kbId
      const configId = item.embedding.configId
      const dimensions = item.embedding.dimensions
      const fileKey = item.doc.fileKey

      const tableName = safeVectorTableName(configId, dimensions)
      const key = `${kbId}::${tableName}`

      const existing = scopeMap.get(key)
      if (!existing) {
        scopeMap.set(key, {
          knowledgeBaseId: kbId,
          tableName,
          fileKeys: fileKey ? [fileKey] : []
        })
      } else {
        if (fileKey && !existing.fileKeys?.includes(fileKey)) {
          existing.fileKeys = [...(existing.fileKeys || []), fileKey]
        }
      }
    }

    const scopes = Array.from(scopeMap.values()).filter((s) => (s.fileKeys?.length ?? 0) > 0)
    if (scopes.length === 0) return undefined

    return {
      scopes,
      // sensible defaults; can be exposed in UI later
      k: 10,
      ef: 100
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

    const inputBarStore = useInputBarStore()
    const mode = inputBarStore.mode

    const knowledgeQaStore = useKnowledgeQaConfigStore()
    const knowledgeQaConfig = knowledgeQaStore.config as KnowledgeQaModelConfig

    if (mode === 'agent') {
      if (
        !knowledgeQaConfig.planModel.providerId ||
        !knowledgeQaConfig.planModel.modelId ||
        !knowledgeQaConfig.summaryModel.providerId ||
        !knowledgeQaConfig.summaryModel.modelId
      ) {
        window.alert('请先在 Agent设置 中配置“规划模型”和“总结模型”。')
        return
      }
    }

    // Agent mode: attach retrieval scope snapshot + provider override
    let retrieval = mode === 'agent' ? buildRetrievalConfigFromSources() : undefined

    if (mode === 'agent' && retrieval) {
      retrieval.k = knowledgeQaConfig.retrieval.topK

      if (knowledgeQaConfig.retrieval.enableRerank && knowledgeQaConfig.retrieval.rerankModelId) {
        retrieval.rerankModelId = knowledgeQaConfig.retrieval.rerankModelId
        retrieval.rerankTopN = knowledgeQaConfig.retrieval.topK
      } else {
        retrieval.rerankModelId = undefined
        retrieval.rerankTopN = undefined
      }
    }

    const modelConfigStore = useModelConfigStore()
    const provider = modelConfigStore.providers.find((p) => p.id === currentProviderId.value)

    const providerOverride =
      mode === 'agent' && provider
        ? {
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            defaultHeaders: undefined
          }
        : undefined

    const startRes = await AiChatDataSource.startStream({
      conversationId,
      agentId: currentAgentId.value,
      providerId: currentProviderId.value,
      modelId: currentModelId.value,
      input,
      enableThinking: enableThinking.value,
      mode,
      retrieval,
      providerOverride,
      agentModelConfig:
        mode === 'agent'
          ? {
              knowledgeQa: {
                ...knowledgeQaConfig,
                retrieval: {
                  ...knowledgeQaConfig.retrieval,
                  rerankTopN: knowledgeQaConfig.retrieval.topK
                }
              }
            }
          : undefined
    })

    messageStore.startGenerating(startRes.requestId)
  }

  async function abortGeneration(): Promise<void> {
    if (!messageStore.currentRequestId) return
    await AiChatDataSource.abortStream({ requestId: messageStore.currentRequestId })
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
