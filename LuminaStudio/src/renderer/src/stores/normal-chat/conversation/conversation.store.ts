import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  NormalChatConversationSnapshot,
  NormalChatConversationMessage,
  NormalChatConversationStreamEvent,
  NormalChatFunctionCallMessagePart,
  NormalChatMessagePart,
  NormalChatRequestMetrics,
  NormalChatTaskDetail,
  NormalChatThinkingMessagePart,
  NormalChatTopic
} from '@preload/types'
import { useNormalChatWorkspaceStore } from '../workspace/workspace.store'
import { NormalChatConversationDatasource } from './conversation.datasource'
import type {
  NormalChatConversationDisplayMessage,
  NormalChatPendingSubAgentRecord,
  NormalChatPendingTextAppendInput,
  NormalChatRenderBlock,
  NormalChatStreamOverlayState
} from './conversation.types'

interface ConversationRuntimeState {
  messagesByTopicId: Record<string, NormalChatConversationMessage[]>
  draftByTopicId: Record<string, string>
  streamOverlayByRequestId: Record<string, NormalChatStreamOverlayState | null>
  activeRequestIdByTopicId: Record<string, string>
  sendingByTopicId: Record<string, boolean>
  statusTextByTopicId: Record<string, string>
  lastErrorByTopicId: Record<string, string>
  lastErrorDetailByTopicId: Record<string, string>
  requestMetricsByRequestId: Record<string, NormalChatRequestMetrics | null>
  taskDetailByRequestId: Record<string, NormalChatTaskDetail | null>
  pendingSubAgentsByRequestId: Record<string, Record<string, NormalChatPendingSubAgentRecord>>
}

function createEmptyState(): ConversationRuntimeState {
  return {
    messagesByTopicId: {},
    draftByTopicId: {},
    streamOverlayByRequestId: {},
    activeRequestIdByTopicId: {},
    sendingByTopicId: {},
    statusTextByTopicId: {},
    lastErrorByTopicId: {},
    lastErrorDetailByTopicId: {},
    requestMetricsByRequestId: {},
    taskDetailByRequestId: {},
    pendingSubAgentsByRequestId: {}
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

// 从原始 parts 提取主聊天区可见正文。这里只负责派生文本，不参与渲染分组。
function buildMarkdownText(parts: NormalChatMessagePart[]): string {
  return parts
    .filter(
      (part): part is Extract<NormalChatMessagePart, { kind: 'text' }> => part.kind === 'text'
    )
    .map((part) => part.text)
    .join('\n\n')
}

function createStreamOverlay(topicId: string, requestId: string): NormalChatStreamOverlayState {
  const now = new Date().toISOString()
  return {
    requestId,
    topicId,
    createdAt: now,
    updatedAt: now,
    parts: [],
    subAgents: [],
    placeholderLabel: '正在生成…',
    isFinished: false
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

function isSameTextSegment(
  part: NormalChatMessagePart,
  input: Pick<NormalChatPendingTextAppendInput, 'modelCallId' | 'turnKind' | 'roundIndex' | 'depth'>
): part is Extract<NormalChatMessagePart, { kind: 'text' }> {
  return (
    part.kind === 'text' &&
    part.modelCallId === input.modelCallId &&
    part.turnKind === input.turnKind &&
    part.roundIndex === input.roundIndex &&
    part.depth === input.depth
  )
}

function upsertFunctionCallPart(
  parts: NormalChatConversationMessage['parts'],
  part: NormalChatFunctionCallMessagePart
): NormalChatConversationMessage['parts'] {
  const existingIndex = parts.findIndex(
    (item): item is NormalChatFunctionCallMessagePart =>
      item.kind === 'functioncall' && item.callId === part.callId
  )

  const previousPart =
    existingIndex >= 0 ? (parts[existingIndex] as NormalChatFunctionCallMessagePart) : null

  const nextPart: NormalChatFunctionCallMessagePart =
    existingIndex >= 0 && previousPart
      ? {
          ...previousPart,
          ...part,
          input: part.input !== '' ? part.input : previousPart.input,
          output: part.output !== '' ? part.output : previousPart.output,
          errorMessage: part.errorMessage ?? previousPart.errorMessage,
          isStreaming: part.isStreaming ?? previousPart.isStreaming,
          roundIndex: part.roundIndex ?? previousPart.roundIndex,
          batchIndex: part.batchIndex ?? previousPart.batchIndex,
          parallelIndex: part.parallelIndex ?? previousPart.parallelIndex,
          depth: part.depth ?? previousPart.depth,
          decisionReason: part.decisionReason ?? previousPart.decisionReason
        }
      : part

  const nextParts = [...parts]
  if (existingIndex >= 0) {
    nextParts[existingIndex] = nextPart
  } else {
    nextParts.push(nextPart)
  }

  return nextParts
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

function partIdentity(part: NormalChatMessagePart, index: number): string {
  if (part.kind === 'functioncall') {
    return `functioncall:${part.callId}`
  }
  if (part.kind === 'thinking') {
    return `thinking:${part.title}:${part.roundIndex}:${part.depth}`
  }
  return textPartIdentity(part, index)
}

// 把 committed raw parts 与 request 级 overlay 合并成一份稳定的原始 part 列表。
// 规则：overlay 先决定顺序，base 再覆盖同 identity 的最终字段。
function mergeRawAndOverlayParts(
  baseParts: NormalChatConversationMessage['parts'],
  overlayParts: NormalChatConversationMessage['parts']
): NormalChatConversationMessage['parts'] {
  if (overlayParts.length === 0) {
    return baseParts
  }

  const order: string[] = []
  const partMap = new Map<string, NormalChatMessagePart>()

  const applyPart = (
    part: NormalChatMessagePart,
    index: number,
    source: 'overlay' | 'base'
  ): void => {
    const key = partIdentity(part, index)
    if (!order.includes(key)) {
      order.push(key)
    }
    if (source === 'base' || !partMap.has(key)) {
      partMap.set(key, part)
    }
  }

  overlayParts.forEach((part, index) => applyPart(part, index, 'overlay'))
  baseParts.forEach((part, index) => applyPart(part, index, 'base'))

  return order
    .map((key) => partMap.get(key))
    .filter((part): part is NormalChatMessagePart => Boolean(part))
}

// 统一把原始 parts 投影为渲染块。
// 注意：subagent 不再进入主聊天流，因此这里显式跳过 system.dispatch_sub_agent。
function buildRenderBlocks(input: {
  parts: NormalChatConversationMessage['parts']
  subAgents: NormalChatPendingSubAgentRecord[]
  isPending: boolean
  placeholderLabel: string
}): NormalChatRenderBlock[] {
  const blocks: NormalChatRenderBlock[] = []
  let batchIndex = 0
  let currentBatch: NormalChatFunctionCallMessagePart[] = []
  const subAgentByActionRunId = new Map(
    input.subAgents.map((record) => [record.actionRunId, record])
  )
  const renderedSubAgentActionRunIds = new Set<string>()

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
        part
      })
      continue
    }

    if (part.functionCallName === 'system.dispatch_sub_agent') {
      flushBatch()
      const record = subAgentByActionRunId.get(part.callId)
      renderedSubAgentActionRunIds.add(part.callId)
      blocks.push({
        kind: 'subagent',
        key: `subagent:${part.callId}`,
        actionRunId: part.callId,
        childAgentRunId: record?.childAgentRunId ?? null,
        goal: record?.goal ?? part.title,
        roundIndex: record?.roundIndex ?? part.roundIndex,
        batchIndex: record?.batchIndex ?? part.batchIndex,
        parallelIndex: record?.parallelIndex ?? part.parallelIndex,
        depth: record?.depth ?? part.depth,
        status:
          part.status === 'success'
            ? 'completed'
            : part.status === 'error' || part.status === 'aborted'
              ? 'failed'
              : 'created'
      })
      continue
    }

    currentBatch.push(part)
  }

  flushBatch()

  const orphanSubAgents = input.subAgents
    .filter((record) => !renderedSubAgentActionRunIds.has(record.actionRunId))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))

  for (const record of orphanSubAgents) {
    blocks.push({
      kind: 'subagent',
      key: `subagent:${record.actionRunId}`,
      actionRunId: record.actionRunId,
      childAgentRunId: record.childAgentRunId,
      goal: record.goal,
      roundIndex: record.roundIndex,
      batchIndex: record.batchIndex,
      parallelIndex: record.parallelIndex,
      depth: record.depth,
      status: 'created'
    })
  }

  if (blocks.length === 0 && input.isPending) {
    blocks.push({
      kind: 'placeholder',
      key: 'placeholder:pending',
      label: input.placeholderLabel
    })
  }

  return blocks
}

// 生成主聊天区最终展示消息。
// 这是 renderer 的规范模型入口，UI 组件不应再直接依赖 raw message 结构。
function buildRequestMetrics(detail: NormalChatTaskDetail): NormalChatRequestMetrics {
  return {
    providerId: detail.modelProviderId,
    providerName: detail.modelProviderId,
    modelId: detail.modelId,
    modelName: detail.modelId,
    firstTokenLatencyMs: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    modelCallCount: detail.modelCalls.length,
    streamingEnabled: detail.executionSnapshot.runtime.streamingEnabled
  }
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
  subAgents?: NormalChatPendingSubAgentRecord[]
}): NormalChatConversationDisplayMessage {
  const blocks = buildRenderBlocks({
    parts: input.parts,
    subAgents: input.subAgents ?? [],
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

export const useNormalChatConversationStore = defineStore('normal-chat-conversation', () => {
  const workspaceStore = useNormalChatWorkspaceStore()
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
    const topic = currentTopic.value
    if (!topic) {
      return []
    }

    const assistantName = workspaceStore.currentAssistant?.name ?? '助手'
    const activeRequestId = state.value.activeRequestIdByTopicId[topic.id] ?? null
    const messages = state.value.messagesByTopicId[topic.id] ?? []
    const overlays = state.value.streamOverlayByRequestId
    const displayMessages: NormalChatConversationDisplayMessage[] = []
    const renderedAssistantRequestIds = new Set<string>()

    for (const message of messages) {
      const overlay = message.role === 'assistant' ? (overlays[message.requestId] ?? null) : null
      const mergedParts = overlay
        ? mergeRawAndOverlayParts(message.parts, overlay.parts)
        : message.parts
      displayMessages.push(
        createDisplayMessage({
          messageId: message.id,
          topicId: message.topicId,
          requestId: message.requestId,
          role: message.role,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          assistantName,
          parts: mergedParts,
          isPending: Boolean(message.role === 'assistant' && activeRequestId === message.requestId),
          requestMetrics: state.value.requestMetricsByRequestId[message.requestId] ?? null,
          placeholderLabel: overlay?.placeholderLabel,
          subAgents: overlay?.subAgents ?? []
        })
      )
      if (message.role === 'assistant') {
        renderedAssistantRequestIds.add(message.requestId)
      }
    }

    for (const overlay of Object.values(overlays)) {
      if (!overlay || overlay.topicId !== topic.id) {
        continue
      }
      if (renderedAssistantRequestIds.has(overlay.requestId)) {
        continue
      }
      if (activeRequestId !== overlay.requestId) {
        continue
      }

      displayMessages.push(
        createDisplayMessage({
          messageId: `${topic.id}-pending-assistant-${overlay.requestId}`,
          topicId: topic.id,
          requestId: overlay.requestId,
          role: 'assistant',
          createdAt: overlay.createdAt,
          updatedAt: overlay.updatedAt,
          assistantName,
          parts: overlay.parts,
          isPending: true,
          requestMetrics: state.value.requestMetricsByRequestId[overlay.requestId] ?? null,
          placeholderLabel: overlay.placeholderLabel,
          subAgents: overlay.subAgents
        })
      )
    }

    displayMessages.sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    return displayMessages
  })

  function getTopicActiveRequestId(topicId: string): string | null {
    return state.value.activeRequestIdByTopicId[topicId] ?? null
  }

  function getConversationTurnDetailCached(requestId: string): NormalChatTaskDetail | null {
    return state.value.taskDetailByRequestId[requestId] ?? null
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
    state.value.taskDetailByRequestId = {
      ...state.value.taskDetailByRequestId,
      [requestId]: detail
    }
    state.value.requestMetricsByRequestId = {
      ...state.value.requestMetricsByRequestId,
      [requestId]: detail ? buildRequestMetrics(detail) : null
    }
    return detail
  }

  async function deleteConversationTurn(requestId: string): Promise<void> {
    if (!requestId) {
      return
    }

    await NormalChatConversationDatasource.deleteConversationTurn({ requestId })
    const nextTaskDetailByRequestId = { ...state.value.taskDetailByRequestId }
    const nextRequestMetricsByRequestId = { ...state.value.requestMetricsByRequestId }
    const nextOverlays = { ...state.value.streamOverlayByRequestId }
    const nextPendingSubAgents = { ...state.value.pendingSubAgentsByRequestId }
    delete nextTaskDetailByRequestId[requestId]
    delete nextRequestMetricsByRequestId[requestId]
    delete nextOverlays[requestId]
    delete nextPendingSubAgents[requestId]
    state.value.taskDetailByRequestId = nextTaskDetailByRequestId
    state.value.requestMetricsByRequestId = nextRequestMetricsByRequestId
    state.value.streamOverlayByRequestId = nextOverlays
    state.value.pendingSubAgentsByRequestId = nextPendingSubAgents
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

  function clearTopicOverlays(topicId: string): void {
    const nextOverlays = { ...state.value.streamOverlayByRequestId }
    for (const [requestId, overlay] of Object.entries(nextOverlays)) {
      if (overlay?.topicId === topicId) {
        delete nextOverlays[requestId]
      }
    }
    state.value.streamOverlayByRequestId = nextOverlays
  }

  function upsertMessage(message: NormalChatConversationMessage): void {
    const current = ensureTopicMessageBucket(message.topicId)
    const next = current.filter((item) => item.id !== message.id)
    next.push(message)
    next.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    setTopicMessages(message.topicId, next)
  }

  function updateOverlay(
    topicId: string,
    requestId: string,
    updater: (overlay: NormalChatStreamOverlayState) => NormalChatStreamOverlayState
  ): void {
    const current =
      state.value.streamOverlayByRequestId[requestId] ?? createStreamOverlay(topicId, requestId)
    state.value.streamOverlayByRequestId = {
      ...state.value.streamOverlayByRequestId,
      [requestId]: updater(current)
    }
  }

  function appendOverlayText(
    topicId: string,
    requestId: string,
    input: NormalChatPendingTextAppendInput
  ): void {
    updateOverlay(topicId, requestId, (overlay) => {
      const nextParts = [...overlay.parts]
      const lastTextIndex = findLastTextPartIndex(nextParts)
      const currentTextPart =
        lastTextIndex >= 0
          ? (nextParts[lastTextIndex] as Extract<NormalChatMessagePart, { kind: 'text' }>)
          : null

      if (!currentTextPart || !isSameTextSegment(currentTextPart, input)) {
        nextParts.push({
          kind: 'text',
          text: input.delta,
          modelCallId: input.modelCallId,
          turnKind: input.turnKind,
          roundIndex: input.roundIndex,
          depth: input.depth
        })
      } else {
        nextParts[lastTextIndex] = {
          ...currentTextPart,
          text: `${currentTextPart.text ?? ''}${input.delta}`
        }
      }

      return {
        ...overlay,
        parts: nextParts,
        subAgents: overlay.subAgents,
        updatedAt: new Date().toISOString(),
        placeholderLabel: '正在生成…'
      }
    })
  }

  function upsertOverlayFunctionCall(
    topicId: string,
    requestId: string,
    part: NormalChatFunctionCallMessagePart
  ): void {
    updateOverlay(topicId, requestId, (overlay) => ({
      ...overlay,
      parts: upsertFunctionCallPart(overlay.parts, part),
      subAgents: overlay.subAgents,
      updatedAt: new Date().toISOString(),
      placeholderLabel: '正在生成…'
    }))
  }

  function upsertOverlayThinking(
    topicId: string,
    requestId: string,
    part: NormalChatThinkingMessagePart
  ): void {
    updateOverlay(topicId, requestId, (overlay) => {
      const existingIndex = overlay.parts.findIndex(
        (item): item is NormalChatThinkingMessagePart =>
          item.kind === 'thinking' &&
          item.title === part.title &&
          item.roundIndex === part.roundIndex &&
          item.depth === part.depth
      )

      const nextParts = [...overlay.parts]
      if (existingIndex >= 0) {
        nextParts[existingIndex] = {
          ...(nextParts[existingIndex] as NormalChatThinkingMessagePart),
          ...part
        }
      } else {
        nextParts.push(part)
      }

      return {
        ...overlay,
        parts: nextParts,
        subAgents: overlay.subAgents,
        updatedAt: new Date().toISOString(),
        placeholderLabel: '正在生成…'
      }
    })
  }

  function markOverlayFinished(requestId: string): void {
    const overlay = state.value.streamOverlayByRequestId[requestId]
    if (!overlay) {
      return
    }

    state.value.streamOverlayByRequestId = {
      ...state.value.streamOverlayByRequestId,
      [requestId]: {
        ...overlay,
        isFinished: true,
        updatedAt: new Date().toISOString()
      }
    }
  }

  function removeOverlay(requestId: string): void {
    const next = { ...state.value.streamOverlayByRequestId }
    delete next[requestId]
    state.value.streamOverlayByRequestId = next
  }

  function upsertPendingSubAgent(requestId: string, record: NormalChatPendingSubAgentRecord): void {
    state.value.pendingSubAgentsByRequestId = {
      ...state.value.pendingSubAgentsByRequestId,
      [requestId]: {
        ...(state.value.pendingSubAgentsByRequestId[requestId] ?? {}),
        [record.actionRunId]: record
      }
    }

    const topicId =
      state.value.taskDetailByRequestId[requestId]?.topicId ?? currentTopicId.value ?? ''
    if (!topicId) {
      return
    }

    updateOverlay(topicId, requestId, (overlay) => {
      const nextSubAgents = overlay.subAgents.filter(
        (item) => item.actionRunId !== record.actionRunId
      )
      nextSubAgents.push(record)
      return {
        ...overlay,
        subAgents: nextSubAgents,
        updatedAt: new Date().toISOString()
      }
    })
  }

  function getPendingSubAgents(requestId: string): Record<string, NormalChatPendingSubAgentRecord> {
    return state.value.pendingSubAgentsByRequestId[requestId] ?? {}
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
    setStatusText(topicId, '')
  }

  async function loadTopicConversation(topicId: string): Promise<void> {
    if (!topicId) {
      return
    }

    try {
      const snapshot: NormalChatConversationSnapshot =
        await NormalChatConversationDatasource.getConversation({ topicId })
      setTopicMessages(snapshot.topicId, snapshot.messages)
      clearTopicOverlays(snapshot.topicId)
      const assistantRequestIds = Array.from(
        new Set(
          snapshot.messages
            .filter((message) => message.role === 'assistant')
            .map((message) => message.requestId)
            .filter(Boolean)
        )
      )
      if (assistantRequestIds.length > 0) {
        await Promise.all(
          assistantRequestIds.map((requestId) => loadConversationTurnDetail(requestId))
        )
      }

      if (!getTopicActiveRequestId(snapshot.topicId)) {
        clearTopicRuntime(snapshot.topicId)
      }

      setLastError(snapshot.topicId, '', '')
    } catch (error) {
      setTopicMessages(topicId, [])
      clearTopicOverlays(topicId)
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
          return
        }

        if (getTopicActiveRequestId(event.topicId) !== event.requestId) {
          if (event.type === 'finish') {
            markOverlayFinished(event.requestId)
            setTopicActiveRequestId(event.topicId, null)
            setStatusText(event.topicId, '')
            if (!event.assistantMessageId) {
              removeOverlay(event.requestId)
            }
            void loadConversationTurnDetail(event.requestId)
          }
          return
        }

        if (event.type === 'assistant-part-upsert' && event.part.kind === 'functioncall') {
          upsertOverlayFunctionCall(event.topicId, event.requestId, event.part)
          return
        }

        if (event.type === 'assistant-part-upsert' && event.part.kind === 'thinking') {
          upsertOverlayThinking(event.topicId, event.requestId, event.part)
          return
        }

        if (event.type === 'assistant-body-delta') {
          appendOverlayText(event.topicId, event.requestId, {
            modelCallId: event.modelCallId,
            turnKind: event.turnKind,
            roundIndex: event.roundIndex,
            depth: event.depth,
            delta: event.delta
          })
          return
        }

        if (event.type === 'assistant-final-chunk') {
          appendOverlayText(event.topicId, event.requestId, {
            modelCallId: event.modelCallId,
            turnKind: event.turnKind,
            roundIndex: event.roundIndex,
            depth: event.depth,
            delta: event.delta
          })
          return
        }

        if (event.type === 'subagent-dispatched') {
          upsertPendingSubAgent(event.requestId, {
            actionRunId: event.actionRunId,
            childAgentRunId: event.childAgentRunId,
            goal: event.goal,
            roundIndex: event.roundIndex,
            batchIndex: event.batchIndex,
            parallelIndex: event.parallelIndex,
            depth: event.depth,
            createdAt: new Date().toISOString()
          })
          return
        }

        if (event.type === 'assistant-progress') {
          setStatusText(event.topicId, event.message)
          return
        }

        if (event.type === 'status') {
          setStatusText(event.topicId, event.message)
          return
        }

        if (event.type === 'finish') {
          markOverlayFinished(event.requestId)
          setTopicActiveRequestId(event.topicId, null)
          setStatusText(event.topicId, '')
          if (!event.assistantMessageId) {
            removeOverlay(event.requestId)
          }
          void loadConversationTurnDetail(event.requestId)
          return
        }

        if (event.type === 'error') {
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
      setStatusText(topicId, '')
      markOverlayFinished(requestId)
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
    loadConversationTurnDetail,
    deleteConversationTurn,
    getConversationTurnDetailCached,
    getPendingSubAgents
  }
})
