import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  NormalChatConversationMessage,
  NormalChatFunctionCallMessagePart,
  NormalChatMessagePart,
  NormalChatRequestHeadSnapshot,
  NormalChatRequestMetrics,
  NormalChatSubAgentMessagePart,
  NormalChatThinkingMessagePart,
  NormalChatTopic,
  NormalChatTopicTranscriptSnapshot
} from '@preload/types'
import { useNormalChatWorkspaceStore } from '../workspace/workspace.store'
import { useNormalChatRetrievalConfigStore } from '../retrieval-config/retrieval-config.store'
import { NormalChatConversationDatasource } from './conversation.datasource'
import type {
  NormalChatConversationDisplayMessage,
  NormalChatRenderBlock
} from './conversation.types'

interface ConversationRuntimeState {
  messagesByTopicId: Record<string, NormalChatConversationMessage[]>
  requestHeadsByTopicId: Record<string, NormalChatRequestHeadSnapshot[]>
  draftByTopicId: Record<string, string>
  activeRequestIdByTopicId: Record<string, string>
  sendingByTopicId: Record<string, boolean>
  statusTextByTopicId: Record<string, string>
  lastErrorByTopicId: Record<string, string>
  lastErrorDetailByTopicId: Record<string, string>
  requestMetricsByRequestId: Record<string, NormalChatRequestMetrics | null>
}

function toStructuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createEmptyState(): ConversationRuntimeState {
  return {
    messagesByTopicId: {},
    requestHeadsByTopicId: {},
    draftByTopicId: {},
    activeRequestIdByTopicId: {},
    sendingByTopicId: {},
    statusTextByTopicId: {},
    lastErrorByTopicId: {},
    lastErrorDetailByTopicId: {},
    requestMetricsByRequestId: {}
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

function buildMarkdownText(parts: NormalChatMessagePart[]): string {
  return parts
    .filter(
      (part): part is Extract<NormalChatMessagePart, { kind: 'text' }> => part.kind === 'text'
    )
    .map((part) => part.text)
    .join('\n\n')
}

function textPartIdentity(
  part: Extract<NormalChatMessagePart, { kind: 'text' }>,
  index: number
): string {
  if (
    part.modelCallId !== undefined ||
    part.turnKind !== undefined ||
    part.roundIndex !== undefined ||
    part.depth !== undefined
  ) {
    return [
      'text',
      part.modelCallId ?? 'none',
      part.turnKind ?? 'none',
      part.roundIndex ?? 'none',
      part.depth ?? 'none'
    ].join(':')
  }

  return ['text-legacy', index, part.text].join(':')
}

function buildRenderBlocks(input: {
  parts: NormalChatConversationMessage['parts']
  isPending: boolean
  placeholderLabel: string
}): NormalChatRenderBlock[] {
  const blocks: NormalChatRenderBlock[] = []
  let batchIndex = 0
  let currentBatch: NormalChatFunctionCallMessagePart[] = []

  const flushBatch = () => {
    if (currentBatch.length === 0) {
      return
    }

    blocks.push({
      kind: 'function-batch',
      key: `function-batch:${batchIndex}:${currentBatch[0]?.callId ?? 'unknown'}`,
      batchIndex,
      calls: currentBatch
    })
    batchIndex += 1
    currentBatch = []
  }

  for (const [index, part] of input.parts.entries()) {
    if (part.kind === 'text') {
      flushBatch()
      blocks.push({
        kind: 'markdown',
        key: textPartIdentity(part, index),
        text: part.text,
        modelCallId: part.modelCallId ?? null,
        turnKind: part.turnKind,
        roundIndex: part.roundIndex,
        depth: part.depth
      })
      continue
    }

    if (part.kind === 'thinking') {
      flushBatch()
      blocks.push({
        kind: 'thinking',
        key: `thinking:${part.title}:${part.roundIndex}:${part.depth}`,
        part: part as NormalChatThinkingMessagePart
      })
      continue
    }

    if (part.kind === 'subagent') {
      flushBatch()
      blocks.push({
        kind: 'subagent',
        key: `subagent:${part.partId}`,
        part: part as NormalChatSubAgentMessagePart
      })
      continue
    }

    currentBatch.push(part)
  }

  flushBatch()

  if (blocks.length === 0 && input.isPending) {
    blocks.push({
      kind: 'placeholder',
      key: 'placeholder:pending',
      label: input.placeholderLabel
    })
  }

  return blocks
}

function createDisplayMessage(input: {
  messageId: string
  topicId: string
  requestId: string
  role: NormalChatConversationMessage['role']
  createdAt: string
  updatedAt: string
  assistantName: string
  parts: NormalChatConversationMessage['parts']
  isPending: boolean
  requestMetrics: NormalChatRequestMetrics | null
  placeholderLabel?: string
}): NormalChatConversationDisplayMessage {
  const blocks = buildRenderBlocks({
    parts: input.parts,
    isPending: input.isPending,
    placeholderLabel: input.placeholderLabel ?? '正在生成…'
  })

  return {
    id: input.messageId,
    topicId: input.topicId,
    requestId: input.requestId,
    role: input.role,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    author: input.role === 'user' ? '你' : input.assistantName,
    time: input.isPending ? '正在生成' : formatTime(input.createdAt),
    text: buildMarkdownText(input.parts),
    blocks,
    isPending: input.isPending,
    requestMetrics: input.requestMetrics
  }
}

function resolveActiveRequestId(requestHeads: NormalChatRequestHeadSnapshot[]): string | null {
  const activeHead = [...requestHeads]
    .filter((head) => head.status === 'queued' || head.status === 'running')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
  return activeHead?.requestId ?? null
}

function resolveStatusText(requestHeads: NormalChatRequestHeadSnapshot[]): string {
  const activeHead = [...requestHeads]
    .filter((head) => head.status === 'queued' || head.status === 'running')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]

  if (!activeHead) {
    return ''
  }

  switch (activeHead.phase) {
    case 'queued':
      return '请求排队中…'
    case 'preparing_context':
      return '正在准备上下文…'
    case 'building_prompt':
      return '正在构建提示词…'
    case 'awaiting_model':
      return '模型响应中…'
    case 'executing_actions':
      return '正在执行动作…'
    case 'finished':
    default:
      return ''
  }
}

function setTopicRuntimeSnapshot(
  state: ConversationRuntimeState,
  snapshot: NormalChatTopicTranscriptSnapshot
): ConversationRuntimeState {
  const nextActiveRequestId = resolveActiveRequestId(snapshot.requestHeads)
  const nextActiveRequestIdByTopicId = { ...state.activeRequestIdByTopicId }
  if (nextActiveRequestId) {
    nextActiveRequestIdByTopicId[snapshot.topicId] = nextActiveRequestId
  } else {
    delete nextActiveRequestIdByTopicId[snapshot.topicId]
  }

  return {
    ...state,
    messagesByTopicId: {
      ...state.messagesByTopicId,
      [snapshot.topicId]: snapshot.messages
    },
    requestHeadsByTopicId: {
      ...state.requestHeadsByTopicId,
      [snapshot.topicId]: snapshot.requestHeads
    },
    activeRequestIdByTopicId: nextActiveRequestIdByTopicId,
    statusTextByTopicId: {
      ...state.statusTextByTopicId,
      [snapshot.topicId]: resolveStatusText(snapshot.requestHeads)
    }
  }
}

export const useNormalChatConversationStore = defineStore('normal-chat-conversation', () => {
  const workspaceStore = useNormalChatWorkspaceStore()
  const retrievalConfigStore = useNormalChatRetrievalConfigStore()
  const state = ref<ConversationRuntimeState>(createEmptyState())
  const initialized = ref(false)

  let disposeTopicTrace: (() => void) | null = null

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
    const topic = currentTopic.value
    if (!topic) {
      return []
    }

    const assistantName = workspaceStore.currentAssistant?.name ?? '助手'
    const activeRequestIds = new Set(
      (state.value.requestHeadsByTopicId[topic.id] ?? [])
        .filter((head) => head.status === 'queued' || head.status === 'running')
        .map((head) => head.requestId)
    )

    return (state.value.messagesByTopicId[topic.id] ?? [])
      .map((message) =>
        createDisplayMessage({
          messageId: message.id,
          topicId: message.topicId,
          requestId: message.requestId,
          role: message.role,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          assistantName,
          parts: message.parts,
          isPending: message.role === 'assistant' && activeRequestIds.has(message.requestId),
          requestMetrics: state.value.requestMetricsByRequestId[message.requestId] ?? null
        })
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  })

  function getTopicActiveRequestId(topicId: string): string | null {
    return state.value.activeRequestIdByTopicId[topicId] ?? null
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

  async function loadTopicConversation(topicId: string): Promise<void> {
    if (!topicId) {
      return
    }

    try {
      const snapshot = await NormalChatConversationDatasource.getTopicTranscript({ topicId })
      state.value = setTopicRuntimeSnapshot(state.value, snapshot)
      setLastError(snapshot.topicId, '', '')
    } catch (error) {
      state.value.messagesByTopicId = {
        ...state.value.messagesByTopicId,
        [topicId]: []
      }
      state.value.requestHeadsByTopicId = {
        ...state.value.requestHeadsByTopicId,
        [topicId]: []
      }
      const nextActive = { ...state.value.activeRequestIdByTopicId }
      delete nextActive[topicId]
      state.value.activeRequestIdByTopicId = nextActive
      state.value.statusTextByTopicId = {
        ...state.value.statusTextByTopicId,
        [topicId]: ''
      }
      setLastError(topicId, error instanceof Error ? error.message : String(error), '')
    }
  }

  function ensureTopicTraceSubscription(topicId: string): void {
    disposeTopicTrace?.()
    disposeTopicTrace = null

    if (!topicId) {
      return
    }

    disposeTopicTrace = NormalChatConversationDatasource.onTopicTraceEntry(topicId, () => {
      if (currentTopicId.value === topicId) {
        void loadTopicConversation(topicId)
      }
    })
  }

  async function initialize(): Promise<void> {
    if (initialized.value) {
      return
    }

    if (currentTopicId.value) {
      ensureTopicTraceSubscription(currentTopicId.value)
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
          ensureTopicTraceSubscription(topicId)
          await loadTopicConversation(topicId)
          return
        }

        ensureTopicTraceSubscription('')
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
      const nextActive = { ...state.value.activeRequestIdByTopicId }
      delete nextActive[topicId]
      state.value.activeRequestIdByTopicId = nextActive
      state.value.statusTextByTopicId = {
        ...state.value.statusTextByTopicId,
        [topicId]: ''
      }
    }
  }

  async function deleteConversationTurn(requestId: string): Promise<void> {
    if (!requestId) {
      return
    }

    await NormalChatConversationDatasource.deleteConversationTurn({ requestId })
    const nextMetrics = { ...state.value.requestMetricsByRequestId }
    delete nextMetrics[requestId]
    state.value.requestMetricsByRequestId = nextMetrics

    if (currentTopicId.value) {
      await loadTopicConversation(currentTopicId.value)
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
      const knowledgeRetrievalPolicy = toStructuredCloneSafe(
        retrievalConfigStore.knowledgeRetrievalPolicy
      )
      const kgRetrievalPolicy = toStructuredCloneSafe(retrievalConfigStore.kgRetrievalPolicy)
      const accepted = await NormalChatConversationDatasource.sendMessage({
        topicId: topic.id,
        providerId,
        modelId,
        input,
        knowledgeRetrievalPolicy,
        kgRetrievalPolicy
      })

      state.value.messagesByTopicId = {
        ...state.value.messagesByTopicId,
        [topic.id]: [...(state.value.messagesByTopicId[topic.id] ?? []), accepted.message].sort(
          (left, right) => left.createdAt.localeCompare(right.createdAt)
        )
      }
      state.value.activeRequestIdByTopicId = {
        ...state.value.activeRequestIdByTopicId,
        [topic.id]: accepted.requestId
      }
      state.value.statusTextByTopicId = {
        ...state.value.statusTextByTopicId,
        [topic.id]: '请求排队中…'
      }
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
    currentTopicRequestId,
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
    deleteConversationTurn
  }
})
