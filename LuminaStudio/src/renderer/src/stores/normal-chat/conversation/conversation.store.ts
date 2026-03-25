import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  NormalChatConversationMessage,
  NormalChatConversationAgentTreeUpsertEvent,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatFunctionCallMessagePart,
  NormalChatMessagePart,
  NormalChatTopic
} from '@preload/types'
import { useNormalChatWorkspaceStore } from '../workspace/workspace.store'
import { useNormalChatAgentTraceStore } from '../agent-trace/store'
import { NormalChatConversationDatasource } from './conversation.datasource'
import type { NormalChatConversationDisplayMessage } from './conversation.types'

interface ConversationRuntimeState {
  messagesByTopicId: Record<string, NormalChatConversationMessage[]>
  draftByTopicId: Record<string, string>
  pendingAssistantMessageByTopicId: Record<string, NormalChatConversationMessage | null>
  activeRequestIdByTopicId: Record<string, string>
  sendingByTopicId: Record<string, boolean>
  statusTextByTopicId: Record<string, string>
  lastErrorByTopicId: Record<string, string>
  lastErrorDetailByTopicId: Record<string, string>
}

function createEmptyState(): ConversationRuntimeState {
  return {
    messagesByTopicId: {},
    draftByTopicId: {},
    pendingAssistantMessageByTopicId: {},
    activeRequestIdByTopicId: {},
    sendingByTopicId: {},
    statusTextByTopicId: {},
    lastErrorByTopicId: {},
    lastErrorDetailByTopicId: {}
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
  assistantName: string,
  time = formatTime(message.createdAt)
): NormalChatConversationDisplayMessage {
  return {
    ...message,
    author: message.role === 'user' ? '你' : assistantName,
    time,
    text: extractMessageText(message)
  }
}

function createPendingAssistantMessage(
  topicId: string,
  requestId: string
): NormalChatConversationMessage {
  const now = new Date().toISOString()
  return {
    id: `${topicId}-pending-assistant-${requestId}`,
    topicId,
    requestId,
    role: 'assistant',
    parts: [],
    createdAt: now,
    updatedAt: now
  }
}

function findLastTextPartIndex(parts: NormalChatMessagePart[]): number {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (parts[index]?.kind === 'text') {
      return index
    }
  }
  return -1
}

function upsertPendingFunctionCallPart(
  message: NormalChatConversationMessage,
  part: NormalChatFunctionCallMessagePart
): NormalChatConversationMessage {
  const now = new Date().toISOString()
  const existingIndex = message.parts.findIndex(
    (item): item is NormalChatFunctionCallMessagePart =>
      item.kind === 'functioncall' && item.callId === part.callId
  )

  const nextPart: NormalChatFunctionCallMessagePart =
    existingIndex >= 0
      ? {
          ...((message.parts[existingIndex] as NormalChatFunctionCallMessagePart) ?? {}),
          ...part,
          input:
            part.input !== ''
              ? part.input
              : (message.parts[existingIndex] as NormalChatFunctionCallMessagePart).input,
          output:
            part.output !== ''
              ? part.output
              : (message.parts[existingIndex] as NormalChatFunctionCallMessagePart).output,
          errorMessage:
            part.errorMessage ??
            (message.parts[existingIndex] as NormalChatFunctionCallMessagePart).errorMessage,
          isStreaming:
            part.isStreaming ??
            (message.parts[existingIndex] as NormalChatFunctionCallMessagePart).isStreaming,
          roundIndex:
            part.roundIndex ??
            (message.parts[existingIndex] as NormalChatFunctionCallMessagePart).roundIndex,
          batchIndex:
            part.batchIndex ??
            (message.parts[existingIndex] as NormalChatFunctionCallMessagePart).batchIndex,
          parallelIndex:
            part.parallelIndex ??
            (message.parts[existingIndex] as NormalChatFunctionCallMessagePart).parallelIndex,
          depth:
            part.depth ?? (message.parts[existingIndex] as NormalChatFunctionCallMessagePart).depth,
          decisionReason:
            part.decisionReason ??
            (message.parts[existingIndex] as NormalChatFunctionCallMessagePart).decisionReason
        }
      : part

  const nextParts = [...message.parts]
  if (existingIndex >= 0) {
    nextParts[existingIndex] = nextPart
  } else {
    nextParts.push(nextPart)
  }

  return {
    ...message,
    parts: nextParts,
    updatedAt: now
  }
}

export const useNormalChatConversationStore = defineStore('normal-chat-conversation', () => {
  const workspaceStore = useNormalChatWorkspaceStore()
  const agentTraceStore = useNormalChatAgentTraceStore()
  const state = ref<ConversationRuntimeState>(createEmptyState())
  const initialized = ref(false)

  let disposeStream: (() => void) | null = null

  const currentTopic = computed<NormalChatTopic | null>(() => workspaceStore.currentTopic)
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
  const currentLastErrorDetail = computed(() => {
    const topicId = currentTopicId.value
    return topicId ? (state.value.lastErrorDetailByTopicId[topicId] ?? '') : ''
  })
  const currentTopicRequestId = computed(() => {
    const topicId = currentTopicId.value
    return topicId ? (state.value.activeRequestIdByTopicId[topicId] ?? null) : null
  })
  const isCurrentTopicSending = computed(() => {
    const topicId = currentTopicId.value
    return topicId ? Boolean(state.value.sendingByTopicId[topicId]) : false
  })
  const isCurrentTopicStreaming = computed(() => Boolean(currentTopicRequestId.value))
  const canSend = computed(() => {
    return (
      !isCurrentTopicStreaming.value &&
      !isCurrentTopicSending.value &&
      currentDraft.value.trim().length > 0 &&
      Boolean(currentTopic.value) &&
      Boolean(workspaceStore.currentTopicModelProviderId) &&
      Boolean(workspaceStore.currentTopicModelId)
    )
  })
  const canStop = computed(() => Boolean(currentTopicRequestId.value))
  const composerPlaceholder = computed(() => {
    if (!currentTopic.value) {
      return '先选择一个话题'
    }

    if (currentTopicRequestId.value) {
      return '当前回答生成中，点击停止可以中断本轮请求'
    }

    if (isCurrentTopicSending.value) {
      return '消息提交中，请稍候…'
    }

    return `在「${currentTopic.value.title}」里输入消息，Enter 发送，Shift+Enter 换行`
  })
  const currentDisplayMessages = computed<NormalChatConversationDisplayMessage[]>(() => {
    if (!currentTopic.value) {
      return []
    }

    const assistantName = workspaceStore.currentAssistant?.name ?? '助手'
    const messages = state.value.messagesByTopicId[currentTopic.value.id] ?? []
    const displayMessages = messages.map((message) => createDisplayMessage(message, assistantName))
    const pendingMessage = state.value.pendingAssistantMessageByTopicId[currentTopic.value.id]

    if (pendingMessage) {
      displayMessages.push({
        ...createDisplayMessage(pendingMessage, assistantName, '正在生成'),
        isPending: true
      })
    }

    return displayMessages
  })

  function getTopicActiveRequestId(topicId: string): string | null {
    return state.value.activeRequestIdByTopicId[topicId] ?? null
  }

  function setTopicActiveRequestId(topicId: string, requestId: string | null): void {
    const next = { ...state.value.activeRequestIdByTopicId }
    if (requestId) {
      next[topicId] = requestId
    } else {
      delete next[topicId]
    }
    state.value.activeRequestIdByTopicId = next
  }

  function setTopicSending(topicId: string, sending: boolean): void {
    const next = { ...state.value.sendingByTopicId }
    if (sending) {
      next[topicId] = true
    } else {
      delete next[topicId]
    }
    state.value.sendingByTopicId = next
  }

  async function loadConversationTurnDetail(requestId: string) {
    if (!requestId) {
      return null
    }

    const detail = await NormalChatConversationDatasource.getConversationTurnDetail({ requestId })
    agentTraceStore.hydrateTurnDetail(detail)
    return detail
  }

  async function deleteConversationTurn(requestId: string): Promise<void> {
    if (!requestId) {
      return
    }

    await NormalChatConversationDatasource.deleteConversationTurn({ requestId })
    agentTraceStore.deleteRequestTrace(requestId)
    if (currentTopicId.value) {
      await loadTopicConversation(currentTopicId.value)
    }
  }

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

  function upsertPendingAssistantMessage(
    topicId: string,
    requestId: string,
    updater: (message: NormalChatConversationMessage) => NormalChatConversationMessage
  ): void {
    const current = state.value.pendingAssistantMessageByTopicId[topicId]
    const nextMessage = updater(current ?? createPendingAssistantMessage(topicId, requestId))

    state.value.pendingAssistantMessageByTopicId = {
      ...state.value.pendingAssistantMessageByTopicId,
      [topicId]: nextMessage
    }
  }

  function appendPendingText(topicId: string, requestId: string, delta: string): void {
    upsertPendingAssistantMessage(topicId, requestId, (message) => {
      const now = new Date().toISOString()
      const nextParts = [...message.parts]
      const lastTextIndex = findLastTextPartIndex(nextParts)
      const hasFunctionCallAfterText =
        lastTextIndex >= 0 &&
        nextParts.slice(lastTextIndex + 1).some((part) => part.kind === 'functioncall')

      if (lastTextIndex === -1 || hasFunctionCallAfterText) {
        nextParts.push({ kind: 'text', text: delta })
        return {
          ...message,
          parts: nextParts,
          updatedAt: now
        }
      }

      const currentTextPart = nextParts[lastTextIndex] as Extract<
        NormalChatMessagePart,
        { kind: 'text' }
      >
      nextParts[lastTextIndex] = {
        kind: 'text',
        text: `${currentTextPart.text ?? ''}${delta}`
      }

      return {
        ...message,
        parts: nextParts,
        updatedAt: now
      }
    })
  }

  function upsertPendingFunctionCall(
    topicId: string,
    requestId: string,
    part: NormalChatFunctionCallMessagePart
  ): void {
    upsertPendingAssistantMessage(topicId, requestId, (message) =>
      upsertPendingFunctionCallPart(message, part)
    )
  }

  function clearPendingAssistantMessage(topicId: string): void {
    const next = { ...state.value.pendingAssistantMessageByTopicId }
    delete next[topicId]
    state.value.pendingAssistantMessageByTopicId = next
  }

  function setStatusText(topicId: string, text: string): void {
    state.value.statusTextByTopicId = {
      ...state.value.statusTextByTopicId,
      [topicId]: text
    }
  }

  function setLastError(topicId: string, text: string, detailJson = ''): void {
    state.value.lastErrorByTopicId = {
      ...state.value.lastErrorByTopicId,
      [topicId]: text
    }
    state.value.lastErrorDetailByTopicId = {
      ...state.value.lastErrorDetailByTopicId,
      [topicId]: detailJson
    }
  }

  function clearTopicRuntime(topicId: string): void {
    clearPendingAssistantMessage(topicId)
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

      if (!getTopicActiveRequestId(snapshot.topicId)) {
        clearTopicRuntime(snapshot.topicId)
      }

      setLastError(snapshot.topicId, '', '')
    } catch (error) {
      setTopicMessages(topicId, [])
      if (!getTopicActiveRequestId(topicId)) {
        clearTopicRuntime(topicId)
      }
      setLastError(topicId, error instanceof Error ? error.message : String(error), '')
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
          if (
            event.message.role === 'assistant' &&
            getTopicActiveRequestId(event.topicId) === event.requestId
          ) {
            clearPendingAssistantMessage(event.topicId)
          }
          return
        }

        if (getTopicActiveRequestId(event.topicId) !== event.requestId) {
          return
        }

        if (event.type === 'assistant-part-upsert' && event.part.kind === 'functioncall') {
          upsertPendingFunctionCall(event.topicId, event.requestId, event.part)
          return
        }

        if (event.type === 'agent-tree-upsert') {
          agentTraceStore.upsertRuntimeTree(event as NormalChatConversationAgentTreeUpsertEvent)
          return
        }

        if (event.type === 'assistant-chunk') {
          appendPendingText(event.topicId, event.requestId, event.delta)
          return
        }

        if (event.type === 'status') {
          setStatusText(event.topicId, event.message)
          return
        }

        if (event.type === 'finish') {
          setTopicActiveRequestId(event.topicId, null)
          clearPendingAssistantMessage(event.topicId)
          setStatusText(event.topicId, '')
          return
        }

        if (event.type === 'error') {
          setTopicActiveRequestId(event.topicId, null)
          clearPendingAssistantMessage(event.topicId)
          setStatusText(event.topicId, '')
          setLastError(event.topicId, event.message, event.rawErrorJson ?? '')
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

    setLastError(topicId, '', '')
  }

  function clearDraft(): void {
    setDraftText('')
  }

  async function abortCurrentRequest(): Promise<void> {
    const topicId = currentTopicId.value
    if (!topicId) {
      return
    }

    const requestId = getTopicActiveRequestId(topicId)
    if (!requestId) {
      return
    }

    try {
      await NormalChatConversationDatasource.abort({ requestId })
    } finally {
      setTopicActiveRequestId(topicId, null)
      clearPendingAssistantMessage(topicId)
      setStatusText(topicId, '')
    }
  }

  async function sendCurrentDraft(): Promise<void> {
    const topic = currentTopic.value
    const draft = currentDraft.value
    const input = draft.trim()

    if (!topic || !input) {
      return
    }

    const providerId = workspaceStore.currentTopicModelProviderId
    const modelId = workspaceStore.currentTopicModelId
    if (!providerId || !modelId) {
      setLastError(topic.id, '当前话题还没有可用模型，请先选择模型。', '')
      return
    }

    if (getTopicActiveRequestId(topic.id)) {
      await abortCurrentRequest()
    }

    setLastError(topic.id, '', '')
    clearDraft()
    setTopicSending(topic.id, true)

    try {
      const accepted = await NormalChatConversationDatasource.sendMessage({
        topicId: topic.id,
        providerId,
        modelId,
        input
      })

      upsertMessage(accepted.message)
      setTopicActiveRequestId(topic.id, accepted.requestId)
    } catch (error) {
      state.value.draftByTopicId = {
        ...state.value.draftByTopicId,
        [topic.id]: draft
      }
      setLastError(topic.id, error instanceof Error ? error.message : String(error), '')
      throw error
    } finally {
      setTopicSending(topic.id, false)
    }
  }

  return {
    state,
    currentTopic,
    currentTopicId,
    currentDraft,
    currentStatusText,
    currentLastError,
    currentLastErrorDetail,
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
    loadTopicConversation,
    loadConversationTurnDetail,
    deleteConversationTurn
  }
})
