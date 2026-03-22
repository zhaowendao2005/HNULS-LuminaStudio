import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  NormalChatConversationMessage,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatTopic,
  NormalChatAssistant
} from '@preload/types'
import { useNormalChatWorkspaceStore } from '../workspace/workspace.store'
import { NormalChatConversationDatasource } from './conversation.datasource'
import type { NormalChatConversationDisplayMessage } from './conversation.types'

interface ConversationRuntimeState {
  messagesByTopicId: Record<string, NormalChatConversationMessage[]>
  draftByTopicId: Record<string, string>
  pendingAssistantTextByTopicId: Record<string, string>
  currentRequestId: string | null
  streamingTopicId: string | null
  statusTextByTopicId: Record<string, string>
  lastErrorByTopicId: Record<string, string>
}

function createEmptyState(): ConversationRuntimeState {
  return {
    messagesByTopicId: {},
    draftByTopicId: {},
    pendingAssistantTextByTopicId: {},
    currentRequestId: null,
    streamingTopicId: null,
    statusTextByTopicId: {},
    lastErrorByTopicId: {}
  }
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function extractMessageText(message: NormalChatConversationMessage): string {
  return message.parts
    .filter((part) => part.kind === 'text')
    .map((part) => part.text)
    .join('')
}

function createDisplayMessage(
  message: NormalChatConversationMessage,
  assistantName: string
): NormalChatConversationDisplayMessage {
  return {
    id: message.id,
    role: message.role,
    author: message.role === 'user' ? '你' : assistantName,
    time: formatTime(message.createdAt),
    text: extractMessageText(message)
  }
}

export const useNormalChatConversationStore = defineStore('normal-chat-conversation', () => {
  const workspaceStore = useNormalChatWorkspaceStore()
  const state = ref<ConversationRuntimeState>(createEmptyState())
  const initialized = ref(false)

  let disposeStream: (() => void) | null = null

  const currentTopic = computed<NormalChatTopic | null>(() => workspaceStore.currentTopic)
  const currentAssistant = computed<NormalChatAssistant | null>(
    () => workspaceStore.currentAssistant
  )
  const currentTopicId = computed(() => currentTopic.value?.id ?? '')
  const currentDraft = computed(() => {
    const topicId = currentTopicId.value
    return topicId ? (state.value.draftByTopicId[topicId] ?? '') : ''
  })
  const currentStatusText = computed(() => {
    const topicId = currentTopicId.value
    return topicId ? (state.value.statusTextByTopicId[topicId] ?? '') : ''
  })
  const currentLastError = computed(() => {
    const topicId = currentTopicId.value
    return topicId ? (state.value.lastErrorByTopicId[topicId] ?? '') : ''
  })
  const isCurrentTopicStreaming = computed(() => {
    return Boolean(
      state.value.currentRequestId && state.value.streamingTopicId === currentTopicId.value
    )
  })
  const canSend = computed(() => {
    return (
      !isCurrentTopicStreaming.value &&
      currentDraft.value.trim().length > 0 &&
      Boolean(currentTopic.value) &&
      Boolean(workspaceStore.currentTopicModelProviderId) &&
      Boolean(workspaceStore.currentTopicModelId)
    )
  })
  const canStop = computed(() => Boolean(state.value.currentRequestId))
  const composerPlaceholder = computed(() => {
    if (!currentTopic.value) {
      return '先选择一个话题'
    }

    if (isCurrentTopicStreaming.value) {
      return '当前回答生成中，点击停止可以中断本轮请求'
    }

    return `在「${currentTopic.value.title}」里输入消息，Enter 发送，Shift+Enter 换行`
  })
  const currentDisplayMessages = computed<NormalChatConversationDisplayMessage[]>(() => {
    if (!currentTopic.value) {
      return []
    }

    const assistantName = currentAssistant.value?.name ?? '助手'
    const messages = state.value.messagesByTopicId[currentTopic.value.id] ?? []
    const displayMessages = messages.map((message) => createDisplayMessage(message, assistantName))
    const pendingText = state.value.pendingAssistantTextByTopicId[currentTopic.value.id] ?? ''

    if (pendingText) {
      displayMessages.push({
        id: `${currentTopic.value.id}-pending-assistant`,
        role: 'assistant',
        author: assistantName,
        time: '正在生成',
        text: pendingText,
        isPending: true
      })
    }

    return displayMessages
  })

  function ensureTopicMessageBucket(topicId: string): NormalChatConversationMessage[] {
    return state.value.messagesByTopicId[topicId] ?? []
  }

  function setTopicMessages(topicId: string, messages: NormalChatConversationMessage[]): void {
    state.value.messagesByTopicId = {
      ...state.value.messagesByTopicId,
      [topicId]: messages
    }
  }

  function upsertMessage(message: NormalChatConversationMessage): void {
    const current = ensureTopicMessageBucket(message.topicId)
    const next = current.filter((item) => item.id !== message.id)
    next.push(message)
    next.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    setTopicMessages(message.topicId, next)
  }

  function removeMessage(topicId: string, messageId: string): void {
    const current = ensureTopicMessageBucket(topicId)
    setTopicMessages(
      topicId,
      current.filter((item) => item.id !== messageId)
    )
  }

  function appendPendingText(topicId: string, delta: string): void {
    state.value.pendingAssistantTextByTopicId = {
      ...state.value.pendingAssistantTextByTopicId,
      [topicId]: (state.value.pendingAssistantTextByTopicId[topicId] ?? '') + delta
    }
  }

  function clearPendingText(topicId: string): void {
    const next = { ...state.value.pendingAssistantTextByTopicId }
    delete next[topicId]
    state.value.pendingAssistantTextByTopicId = next
  }

  function setStatusText(topicId: string, text: string): void {
    state.value.statusTextByTopicId = {
      ...state.value.statusTextByTopicId,
      [topicId]: text
    }
  }

  function setLastError(topicId: string, text: string): void {
    state.value.lastErrorByTopicId = {
      ...state.value.lastErrorByTopicId,
      [topicId]: text
    }
  }

  function clearTopicRuntime(topicId: string): void {
    clearPendingText(topicId)
    setStatusText(topicId, '')
  }

  async function loadTopicConversation(topicId: string): Promise<void> {
    if (!topicId) {
      return
    }

    try {
      const snapshot: NormalChatConversationSnapshot =
        await NormalChatConversationDatasource.getConversation({
          topicId
        })
      setTopicMessages(snapshot.topicId, snapshot.messages)
      clearTopicRuntime(snapshot.topicId)
      setLastError(snapshot.topicId, '')
    } catch (error) {
      setTopicMessages(topicId, [])
      clearTopicRuntime(topicId)
      setLastError(topicId, error instanceof Error ? error.message : String(error))
    }
  }

  function ensureStreamSubscription(): void {
    if (disposeStream) {
      return
    }

    disposeStream = NormalChatConversationDatasource.onStream(
      (event: NormalChatConversationStreamEvent) => {
        if (event.type === 'message-committed') {
          upsertMessage(event.message)
          if (event.message.role === 'assistant') {
            clearPendingText(event.topicId)
          }
          return
        }

        if (event.type === 'assistant-chunk') {
          if (state.value.currentRequestId !== event.requestId) {
            return
          }

          appendPendingText(event.topicId, event.delta)
          state.value.streamingTopicId = event.topicId
          return
        }

        if (event.type === 'status') {
          if (state.value.currentRequestId !== event.requestId) {
            return
          }

          state.value.streamingTopicId = event.topicId
          setStatusText(event.topicId, event.message)
          return
        }

        if (event.type === 'finish') {
          if (state.value.currentRequestId !== event.requestId) {
            return
          }

          state.value.currentRequestId = null
          if (state.value.streamingTopicId === event.topicId) {
            state.value.streamingTopicId = null
          }
          clearPendingText(event.topicId)
          setStatusText(event.topicId, '')
          return
        }

        if (event.type === 'error') {
          if (state.value.currentRequestId !== event.requestId) {
            return
          }

          state.value.currentRequestId = null
          if (state.value.streamingTopicId === event.topicId) {
            state.value.streamingTopicId = null
          }
          clearPendingText(event.topicId)
          setStatusText(event.topicId, '')
          setLastError(event.topicId, event.message)
        }
      }
    )
  }

  async function initialize(): Promise<void> {
    if (initialized.value) {
      return
    }

    ensureStreamSubscription()
    if (currentTopicId.value) {
      await loadTopicConversation(currentTopicId.value)
    }
    initialized.value = true

    watch(
      () => [workspaceStore.snapshot.activeAssistantId, workspaceStore.snapshot.activeTopicId],
      async ([assistantId, topicId], [prevAssistantId, prevTopicId]) => {
        if (!initialized.value) {
          return
        }

        const assistantChanged = assistantId !== prevAssistantId
        const topicChanged = topicId !== prevTopicId
        if (!assistantChanged && !topicChanged) {
          return
        }

        // 切换助手或话题时，先停掉当前流式请求，避免串台。
        if (state.value.currentRequestId) {
          await abortCurrentRequest()
        }

        if (topicId) {
          await loadTopicConversation(topicId)
        }
      },
      { immediate: false }
    )
  }

  function setDraftText(value: string): void {
    const topicId = currentTopicId.value
    if (!topicId) {
      return
    }

    state.value.draftByTopicId = {
      ...state.value.draftByTopicId,
      [topicId]: value
    }

    // 用户开始重新输入时，顺手清掉旧错误，避免错误提示一直挂着。
    setLastError(topicId, '')
  }

  function clearDraft(): void {
    setDraftText('')
  }

  async function abortCurrentRequest(): Promise<void> {
    if (!state.value.currentRequestId) {
      return
    }

    const requestId = state.value.currentRequestId
    const topicId = state.value.streamingTopicId ?? currentTopicId.value
    try {
      await NormalChatConversationDatasource.abort({ requestId })
    } finally {
      state.value.currentRequestId = null
      state.value.streamingTopicId = null
      if (topicId) {
        clearPendingText(topicId)
        setStatusText(topicId, '')
      }
    }
  }

  async function sendCurrentDraft(): Promise<void> {
    const topic = currentTopic.value
    const assistant = currentAssistant.value
    const input = currentDraft.value.trim()

    if (!topic || !assistant || !input) {
      return
    }

    const providerId = workspaceStore.currentTopicModelProviderId
    const modelId = workspaceStore.currentTopicModelId
    if (!providerId || !modelId) {
      setLastError(topic.id, '当前话题还没有可用模型，请先选择模型。')
      return
    }

    if (state.value.currentRequestId) {
      await abortCurrentRequest()
    }

    const messageId = crypto.randomUUID()
    const requestId = crypto.randomUUID()
    const userMessage: NormalChatConversationMessage = {
      id: messageId,
      topicId: topic.id,
      role: 'user',
      parts: [{ kind: 'text', text: input }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setLastError(topic.id, '')
    clearDraft()
    upsertMessage(userMessage)
    state.value.currentRequestId = requestId
    state.value.streamingTopicId = topic.id

    try {
      await NormalChatConversationDatasource.sendMessage({
        topicId: topic.id,
        assistantId: assistant.id,
        providerId,
        modelId,
        effectiveSystemPrompt: workspaceStore.effectiveSystemPrompt,
        input,
        messageId,
        requestId
      })
    } catch (error) {
      // 发送前置失败时，回滚本地乐观更新，避免界面和后端不同步。
      removeMessage(topic.id, messageId)
      state.value.currentRequestId = null
      state.value.streamingTopicId = null
      state.value.draftByTopicId = {
        ...state.value.draftByTopicId,
        [topic.id]: input
      }
      setLastError(topic.id, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  return {
    state,
    currentTopic,
    currentAssistant,
    currentTopicId,
    currentDraft,
    currentStatusText,
    currentLastError,
    currentDisplayMessages,
    isCurrentTopicStreaming,
    canSend,
    canStop,
    composerPlaceholder,
    initialize,
    setDraftText,
    clearDraft,
    sendCurrentDraft,
    abortCurrentRequest,
    loadTopicConversation
  }
})
