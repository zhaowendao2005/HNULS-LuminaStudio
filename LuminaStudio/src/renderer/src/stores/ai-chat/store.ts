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
import { useUserConfigStore } from '@renderer/stores/user-config/store'
import type { KnowledgeQaModelConfig } from '@shared/langchain-client.types'

export const useAiChatStore = defineStore('ai-chat', () => {
  // ===== Chat Message Store =====
  const messageStore = useChatMessageStore()

  // ===== State =====
  const presets = ref<AgentInfo[]>([])
  const conversationsByPreset = ref<Record<string, ConversationSummary[]>>({})

  const currentPresetId = ref<string | null>(null)
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
    if (!currentPresetId.value) return []
    return conversationsByPreset.value[currentPresetId.value] || []
  })

  // ===== Actions =====
  async function loadPresets(): Promise<void> {
    presets.value = await AiChatDataSource.listPresets()
    if (!currentPresetId.value && presets.value.length > 0) {
      currentPresetId.value = presets.value[0].id
    }
  }

  async function selectPreset(presetId: string): Promise<void> {
    currentPresetId.value = presetId
    await loadConversations(presetId)
  }

  async function loadConversations(presetId: string): Promise<void> {
    const list = await AiChatDataSource.listConversations(presetId)
    conversationsByPreset.value = {
      ...conversationsByPreset.value,
      [presetId]: list
    }
  }

  async function createPreset(name: string, description?: string | null): Promise<void> {
    const preset = await AiChatDataSource.createPreset({ name, description })
    presets.value = [...presets.value, preset]
    currentPresetId.value = preset.id
    conversationsByPreset.value = { ...conversationsByPreset.value, [preset.id]: [] }
    currentConversationId.value = null
  }

  async function createConversation(payload: {
    presetId: string
    title?: string | null
    providerId: string
    modelId: string
    enableThinking?: boolean
  }): Promise<void> {
    const conversation = await AiChatDataSource.createConversation(payload)
    await loadConversations(payload.presetId)
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

    if (!currentPresetId.value) {
      await loadPresets()
    }

    if (!currentPresetId.value) {
      throw new Error('No preset available')
    }

    if (!currentProviderId.value || !currentModelId.value) {
      throw new Error('Model is not selected')
    }
    let conversationId = currentConversationId.value
    if (!conversationId) {
      await createConversation({
        presetId: currentPresetId.value,
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
    // 解包 ref 并深拷贝为纯对象，避免 IPC 序列化问题
    const knowledgeQaConfig = JSON.parse(
      JSON.stringify(knowledgeQaStore.config)
    ) as KnowledgeQaModelConfig

    // 注入 PubMed API Key （从全局 user-config store 获取）
    // 注意：apiKey 是可选的，无 key 时使用 3次/秒，有 key 时 10次/秒
    if (mode === 'agent') {
      const userConfigStore = useUserConfigStore()
      const pubmedApiKey = userConfigStore.pubmedApiKey?.trim()
      // 只在非空时注入，空字符串/undefined 都不注入
      if (pubmedApiKey) {
        knowledgeQaConfig.pubmed = { apiKey: pubmedApiKey }
      }
    }

    if (mode === 'agent') {
      if (
        !knowledgeQaConfig.planModel.providerId ||
        !knowledgeQaConfig.planModel.modelId ||
        !knowledgeQaConfig.summaryModel.providerId ||
        !knowledgeQaConfig.summaryModel.modelId
      ) {
        window.alert('请先在 Agent设置 中配置"规划模型"和"总结模型"。')
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

    // 提取为纯对象，避免响应式包装器导致 IPC 序列化失败
    const providerOverride =
      mode === 'agent' && provider
        ? {
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            defaultHeaders: undefined
          }
        : undefined

    const requestId = crypto.randomUUID()
    messageStore.startGenerating(requestId)
    try {
      const startRes = await AiChatDataSource.startStream({
        requestId,
        conversationId,
        presetId: currentPresetId.value,
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

      if (startRes.requestId !== requestId) {
        messageStore.startGenerating(startRes.requestId)
      }
    } catch (err) {
      messageStore.stopGenerating()
      throw err
    }
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

  async function deleteConversation(conversationId: string): Promise<void> {
    await AiChatDataSource.deleteConversation(conversationId)

    // 如果删除的是当前对话，清空当前对话 ID
    // 消息会在下次 switchConversation 时自动加载新的消息列表
    if (currentConversationId.value === conversationId) {
      currentConversationId.value = null
    }

    // 刷新对话列表
    if (currentPresetId.value) {
      await loadConversations(currentPresetId.value)
    }
  }

  async function deletePreset(presetId: string): Promise<void> {
    await AiChatDataSource.deletePreset(presetId)

    // 如果删除的是当前 Preset，切换到第一个 Preset
    if (currentPresetId.value === presetId) {
      currentConversationId.value = null
      currentPresetId.value = null
    }

    // 刷新 Preset 列表
    await loadPresets()
  }

  return {
    // state
    presets,
    currentPresetId,
    conversationsByPreset,
    currentConversationId,
    currentProviderId,
    currentModelId,
    enableThinking,
    isGenerating,

    // computed
    currentMessages,
    currentConversations,

    // actions
    loadPresets,
    selectPreset,
    loadConversations,
    createPreset,
    createConversation,
    switchConversation,
    sendMessage,
    abortGeneration,
    setCurrentModel,
    setThinkingEnabled,
    deleteConversation,
    deletePreset
  }
})
