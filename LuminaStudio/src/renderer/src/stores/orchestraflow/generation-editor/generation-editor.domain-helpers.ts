import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  GenerationChannelKey,
  GenerationDocument,
  GenerationStageConfig,
  GenerationStageKey,
  GenerationStreamEvent
} from '@preload/types'
import type { GenerateSessionDetailViewModel } from './generation-editor.types'

/**
 * 统一的流式消息本地状态。
 *
 * 每个对话通道自己维护一套 request -> message 的映射，
 * 避免之前所有通道共享一个大 map，导致职责混杂。
 */
export interface ChannelStreamLocalState {
  streamMessageIdByRequest: Record<string, string>
  activeRequestId: string | null
}

export function createChannelStreamLocalState(): ChannelStreamLocalState {
  return {
    streamMessageIdByRequest: {},
    activeRequestId: null
  }
}

export function applyStreamEventToChannelMessages(params: {
  detail: GenerateSessionDetailViewModel | null
  channelKey: GenerationChannelKey
  event: GenerationStreamEvent
  localState: ChannelStreamLocalState
}): boolean {
  const { detail, channelKey, event, localState } = params
  if (!detail || event.channelKey !== channelKey) return false

  const channelMessages = detail.messagesByChannel[channelKey]

  if (event.type === 'stream-start') {
    const target =
      channelMessages.find((item) => {
        return (
          item.id === event.messageId ||
          item.id === localState.streamMessageIdByRequest[event.requestId] ||
          (item.requestId === event.requestId && item.role === 'assistant')
        )
      }) || findPendingOptimisticAssistantMessage(channelMessages)

    if (target) {
      // stream-start 可能会早于 sendMessage 返回 requestId。
      // 这里优先把事件绑定到本地 optimistic assistant，避免首批 delta 被丢掉。
      target.requestId = event.requestId
      target.status = 'streaming'
      localState.streamMessageIdByRequest[event.requestId] = target.id
    } else {
      localState.streamMessageIdByRequest[event.requestId] = event.messageId
    }
    localState.activeRequestId = event.requestId
    return true
  }

  const target = channelMessages.find((item) => {
    return (
      item.id === event.messageId ||
      item.id === localState.streamMessageIdByRequest[event.requestId] ||
      (item.requestId === event.requestId && item.role === 'assistant')
    )
  })
  if (!target) return false

  if (event.type === 'text-delta') {
    target.content += event.delta
    target.status = 'streaming'
    target.requestId = event.requestId
    return true
  }

  if (event.type === 'message-meta') {
    target.metaJson = event.metaJson
    target.status = 'streaming'
    target.requestId = event.requestId
    return true
  }

  if (event.type === 'error') {
    target.error = event.message
    target.status = 'error'
    target.requestId = event.requestId
    delete localState.streamMessageIdByRequest[event.requestId]
    localState.activeRequestId = null
    return true
  }

  if (event.type === 'finish') {
    target.status =
      event.finishReason === 'stop'
        ? 'final'
        : event.finishReason === 'aborted'
          ? 'aborted'
          : 'error'
    target.requestId = event.requestId
    target.usageJson = event.usageJson ?? null
    delete localState.streamMessageIdByRequest[event.requestId]
    localState.activeRequestId = null
    return true
  }

  return false
}

function findPendingOptimisticAssistantMessage(
  channelMessages: GenerateSessionDetailViewModel['messagesByChannel'][GenerationChannelKey]
) {
  return [...channelMessages]
    .reverse()
    .find((item) => item.role === 'assistant' && item.status === 'streaming' && !item.requestId)
}

export function appendOptimisticMessages(params: {
  detail: GenerateSessionDetailViewModel
  channelKey: GenerationChannelKey
  content: string
  config: GenerationStageConfig
  designDocumentId?: string | null
  assistantMetaJson?: string | null
}): { assistantId: string } {
  const assistantId = crypto.randomUUID()
  const channelMessages = params.detail.messagesByChannel[params.channelKey]

  channelMessages.push({
    id: crypto.randomUUID(),
    sessionId: params.detail.id,
    channelKey: params.channelKey,
    designDocumentId: params.designDocumentId || null,
    requestId: null,
    role: 'user',
    content: params.content,
    status: 'final',
    providerId: params.config.providerId,
    modelId: params.config.modelId,
    error: null,
    usageJson: null,
    metaJson: null,
    rawResponseText: null,
    rawTraceJson: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  channelMessages.push({
    id: assistantId,
    sessionId: params.detail.id,
    channelKey: params.channelKey,
    designDocumentId: params.designDocumentId || null,
    requestId: null,
    role: 'assistant',
    content: '',
    status: 'streaming',
    providerId: params.config.providerId,
    modelId: params.config.modelId,
    error: null,
    usageJson: null,
    metaJson: params.assistantMetaJson ?? null,
    rawResponseText: null,
    rawTraceJson: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  return { assistantId }
}

export function markOptimisticAssistantMessageError(params: {
  detail: GenerateSessionDetailViewModel
  channelKey: GenerationChannelKey
  assistantId: string
  message: string
  localState: ChannelStreamLocalState
}): void {
  const channelMessages = params.detail.messagesByChannel[params.channelKey]
  const target = channelMessages.find((item) => item.id === params.assistantId)

  if (target) {
    target.status = 'error'
    target.error = params.message
    target.updatedAt = new Date().toISOString()
  }

  params.localState.activeRequestId = null
}

export function createStageConfigStore(storeId: string) {
  return defineStore(storeId, () => {
    const configBySessionId = ref<Record<string, GenerationStageConfig>>({})

    const getConfig = computed(() => {
      return (sessionId: string | null): GenerationStageConfig | null => {
        if (!sessionId) return null
        return configBySessionId.value[sessionId] ?? null
      }
    })

    function setConfig(sessionId: string, config: GenerationStageConfig): void {
      configBySessionId.value[sessionId] = config
    }

    return {
      configBySessionId,
      getConfig,
      setConfig
    }
  })
}

export function createStageDocumentStore(storeId: string) {
  return defineStore(storeId, () => {
    const documentBySessionId = ref<Record<string, GenerationDocument>>({})

    const getDocument = computed(() => {
      return (sessionId: string | null): GenerationDocument | null => {
        if (!sessionId) return null
        return documentBySessionId.value[sessionId] ?? null
      }
    })

    function setDocument(sessionId: string, document: GenerationDocument): void {
      documentBySessionId.value[sessionId] = document
    }

    return {
      documentBySessionId,
      getDocument,
      setDocument
    }
  })
}

export function pickStageDocument(
  detail: GenerateSessionDetailViewModel | null,
  stageKey: GenerationStageKey
): GenerationDocument | null {
  if (!detail) return null
  return detail.documents[stageKey]
}

export function pickStageConfig(
  detail: GenerateSessionDetailViewModel | null,
  stageKey: GenerationStageKey
): GenerationStageConfig | null {
  if (!detail) return null
  return detail.stageConfigs[stageKey]
}
