import { randomUUID } from 'crypto'
import { AIMessageChunk } from '@langchain/core/messages'
import type {
  NormalChatAgentStatusSummary,
  NormalChatConversationMessage,
  NormalChatConversationSnapshot,
  NormalChatConversationPromptMessage,
  NormalChatConversationStreamEvent,
  NormalChatConversationTurnRequestRecord,
  NormalChatConversationTurnResponseRecord,
  NormalChatConversationRuntimeTrace,
  NormalChatFunctionCallMessagePart,
  NormalChatMessagePart,
  NormalChatRequestMetrics,
  NormalChatSendMessageAccepted,
  NormalChatSendMessageRequest
} from '@preload/types'
import type { PaperRetrievalService } from '../../paper-retrieval'
import type { DatabaseManager } from '../../database-sqlite'
import { logger } from '../../logger'
import { NormalChatRepository } from '../normal-chat.repository'
import type { NormalChatLlmClient } from '../llm-client'
import { NormalChatRequestAssembler } from '../request/normal-chat-request-assembler'
import { NormalChatRequestLifecycleManager } from '../request/normal-chat-request-lifecycle'
import { createNormalChatAgentSuite } from '../agent/registry'
import type { NormalChatAgentExecutionServices } from '../agent/contracts'
import { createNormalChatHelperLibrary } from '../functioncalls/registry'
import { NormalChatAgentTreeStore } from './agent-tree-store'
import { NormalChatRuntimeEventSink } from './event-sink'
import { NormalChatAgentSessionManager } from './agent-session-manager'

interface ConversationTraceState {
  requestId: string
  topicId: string
  assistantId: string
  assistantName: string
  assistantEmoji: string
  topicTitle: string
  saveFullConversationEnabled: boolean
  requestRecord: NormalChatConversationTurnRequestRecord
  responseRecord: NormalChatConversationTurnResponseRecord
  runtimeTrace: NormalChatConversationRuntimeTrace
}

const log = logger.scope('NormalChatConversationRuntime')

function resolvePreferredFinalAnswer(
  agentTree: NormalChatConversationRuntimeTrace['agentTree'],
  synthesisSummary: string
): string {
  const rootAgentId = agentTree?.rootAgentId
  const rootFinalResult =
    rootAgentId && agentTree?.agents[rootAgentId]?.finalResult
      ? (agentTree.agents[rootAgentId].finalResult?.trim() ?? '')
      : ''

  if (rootFinalResult) {
    return rootFinalResult
  }

  return synthesisSummary.trim()
}

function buildAssistantMessageParts(
  parts: NormalChatMessagePart[],
  text: string
): NormalChatMessagePart[] {
  const normalizedText = text.trim() || '模型未返回文本内容。'
  const nextParts = [...parts]
  const textPartIndex = nextParts.findIndex((part) => part.kind === 'text')

  if (textPartIndex >= 0) {
    nextParts[textPartIndex] = {
      kind: 'text',
      text: normalizedText
    }
    return nextParts
  }

  // 即使前面已经有 functioncall block，也要补一个最终文本块，避免用户看到“工具跑了但没有最终回答”。
  nextParts.push({
    kind: 'text',
    text: normalizedText
  })
  return nextParts
}

function buildPromptMessagesFromConversation(
  messages: NormalChatConversationMessage[]
): NormalChatConversationPromptMessage[] {
  return messages
    .map((message) => {
      const text = message.parts
        .filter((part) => part.kind === 'text')
        .map((part) => part.text)
        .join('')
      if (!text) {
        return null
      }

      return {
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: text
      }
    })
    .filter((message) => message !== null) as NormalChatConversationPromptMessage[]
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (typeof item === 'object' && item && 'text' in item && typeof item.text === 'string') {
          return item.text
        }
        return ''
      })
      .join('')
  }

  return String(content ?? '')
}

function buildSerializableError(error: unknown, depth = 0): unknown {
  if (depth > 4) {
    return '[MaxDepthExceeded]'
  }

  if (error === null || error === undefined) {
    return error ?? null
  }

  if (typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean') {
    return error
  }

  if (Array.isArray(error)) {
    return error.slice(0, 20).map((item) => buildSerializableError(item, depth + 1))
  }

  if (error instanceof Error) {
    const base: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null
    }

    for (const [key, value] of Object.entries(error as unknown as Record<string, unknown>)) {
      if (!(key in base)) {
        base[key] = buildSerializableError(value, depth + 1)
      }
    }

    if ('cause' in error) {
      base.cause = buildSerializableError(
        (error as Error & { cause?: unknown }).cause ?? null,
        depth + 1
      )
    }

    return base
  }

  if (typeof error === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(error)) {
      result[key] = buildSerializableError(value, depth + 1)
    }
    return result
  }

  return String(error)
}

function serializeErrorDetails(error: unknown): string {
  try {
    return JSON.stringify(buildSerializableError(error), null, 2)
  } catch {
    return JSON.stringify(
      {
        message: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  }
}

export class NormalChatConversationRuntimeService {
  private readonly repository: NormalChatRepository
  private readonly requestAssembler: NormalChatRequestAssembler
  private readonly lifecycle = new NormalChatRequestLifecycleManager()
  private readonly streamListeners = new Set<(event: NormalChatConversationStreamEvent) => void>()

  constructor(
    databaseManager: DatabaseManager,
    private readonly llmClient: NormalChatLlmClient,
    private readonly paperRetrievalService: PaperRetrievalService
  ) {
    this.repository = new NormalChatRepository(databaseManager.getDatabase('userdata'))
    this.requestAssembler = new NormalChatRequestAssembler(this.repository, this.llmClient)
  }

  onStream(listener: (event: NormalChatConversationStreamEvent) => void): () => void {
    this.streamListeners.add(listener)
    return () => this.streamListeners.delete(listener)
  }

  async getConversation(topicId: string): Promise<NormalChatConversationSnapshot> {
    this.requireTopic(topicId)
    return {
      topicId,
      messages: this.repository.listMessagesByTopicId(topicId)
    }
  }

  async sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted> {
    await this.lifecycle.abortTopicRequest(payload.topicId)

    const controller = new AbortController()
    let resolveSettled: () => void = () => undefined
    const settled = new Promise<void>((resolve) => {
      resolveSettled = resolve
    })
    const assembled = await this.requestAssembler.assembleSendMessage(payload, controller.signal)

    this.lifecycle.register({
      requestId: assembled.requestId,
      topicId: assembled.topic.id,
      controller,
      settled,
      resolveSettled
    })

    try {
      const sortOrder = this.repository.listMessagesByTopicId(assembled.topic.id).length
      this.repository.insertMessage(assembled.userMessage, sortOrder)

      this.emit({
        type: 'message-committed',
        requestId: assembled.requestId,
        topicId: assembled.topic.id,
        message: assembled.userMessage
      })

      setTimeout(() => {
        void this.runConversation({
          ...assembled,
          signal: controller.signal
        })
      }, 0)

      return {
        requestId: assembled.requestId,
        message: assembled.userMessage
      }
    } catch (error) {
      this.lifecycle.finalize(assembled.requestId)
      throw error
    }
  }

  async abort(requestId: string): Promise<void> {
    await this.lifecycle.abortRequest(requestId)
  }

  private async runConversation(params: {
    requestId: string
    input: string
    effectiveSystemPrompt: string
    assistant: {
      id: string
      name: string
      emoji: string
      defaultSystemPrompt: string
      saveFullConversationEnabled: boolean
      streamingEnabled: boolean
      callMode: 'fast' | 'slow' | 'auto'
      costMode: 'per_call' | 'per_token'
      maxRecursionDepth: number
      maxRetriesPerAgent: number
    }
    topic: {
      id: string
      title: string
      systemPromptMode: 'inherit' | 'override'
      systemPromptOverride: string | null
      streamingMode: 'inherit' | 'override'
      streamingEnabledOverride: boolean | null
    }
    provider: {
      providerId: string
      modelId: string
    }
    signal: AbortSignal
  }): Promise<void> {
    const { requestId, assistant, topic, provider, effectiveSystemPrompt, input, signal } = params
    const requestStartedAt = Date.now()
    const streamingEnabled =
      topic.streamingMode === 'override'
        ? (topic.streamingEnabledOverride ?? assistant.streamingEnabled)
        : assistant.streamingEnabled
    const assistantParts: NormalChatMessagePart[] = []
    const functionCallPartIndexByCallId = new Map<string, number>()
    let assistantText = ''
    let assistantTextPartIndex = -1
    let currentTextSegment = ''
    let shouldStartNewTextSegment = false
    let traceState: ConversationTraceState | null = null
    const baseMetrics: NormalChatRequestMetrics = {
      providerId: provider.providerId,
      providerName: null,
      modelId: provider.modelId,
      modelName: provider.modelId,
      firstTokenLatencyMs: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      modelCallCount: 0,
      streamingEnabled
    }

    const emitRuntimeTrace = (
      runtimeTrace: NormalChatConversationRuntimeTrace,
      summary: NormalChatAgentStatusSummary | null = null
    ): void => {
      emitEvent({
        type: 'runtime-trace-upsert',
        requestId,
        topicId: topic.id,
        runtimeTrace,
        summary
      })
    }

    const upsertAssistantTextPart = (text: string, forceNew: boolean): void => {
      const nextText = text.trim() || '模型未返回文本内容。'
      const nextPart: NormalChatMessagePart = {
        kind: 'text',
        text: nextText
      }

      if (
        !forceNew &&
        assistantTextPartIndex >= 0 &&
        assistantParts[assistantTextPartIndex]?.kind === 'text'
      ) {
        assistantParts[assistantTextPartIndex] = nextPart
        return
      }

      assistantTextPartIndex = assistantParts.push(nextPart) - 1
    }

    const handleAssistantPartUpsert = (part: NormalChatFunctionCallMessagePart): void => {
      const currentIndex = functionCallPartIndexByCallId.get(part.callId)
      if (currentIndex !== undefined) {
        assistantParts[currentIndex] = part
        return
      }

      functionCallPartIndexByCallId.set(part.callId, assistantParts.push(part) - 1)
      shouldStartNewTextSegment = true
    }

    const emitEvent = (event: NormalChatConversationStreamEvent): void => {
      if (event.type === 'assistant-final-chunk') {
        const shouldCreateNewSegment = shouldStartNewTextSegment || assistantTextPartIndex < 0
        if (shouldCreateNewSegment) {
          currentTextSegment = ''
        }
        currentTextSegment += event.delta
        assistantText += event.delta
        upsertAssistantTextPart(currentTextSegment, shouldCreateNewSegment)
        shouldStartNewTextSegment = false

        // 首字延迟应该从“请求开始”算到“首个正文增量到达”。
        if (baseMetrics.firstTokenLatencyMs === null) {
          const firstTokenLatencyMs = Date.now() - requestStartedAt
          baseMetrics.firstTokenLatencyMs = firstTokenLatencyMs
          if (traceState) {
            emitRuntimeTrace({
              ...traceState.runtimeTrace,
              metrics: { ...baseMetrics }
            })
          }
        }
      }
      if (event.type === 'assistant-part-upsert' && event.part.kind === 'functioncall') {
        handleAssistantPartUpsert(event.part)
      }
      if (traceState) {
        if (event.type === 'assistant-final-chunk') {
          traceState.responseRecord.chunks.push(event.delta)
          traceState.responseRecord.finalText = assistantText
          if (
            traceState.runtimeTrace.metrics &&
            traceState.runtimeTrace.metrics.firstTokenLatencyMs === null
          ) {
            traceState.runtimeTrace.metrics.firstTokenLatencyMs = baseMetrics.firstTokenLatencyMs
          }
        }
        if (event.type === 'runtime-trace-upsert') {
          traceState.runtimeTrace = event.runtimeTrace
        }
        this.persistConversationTrace(traceState, 'update')
        this.emit({
          type: 'turn-detail-upsert',
          requestId,
          topicId: topic.id
        })
      }
      this.emit(event)
    }

    const eventSink = new NormalChatRuntimeEventSink(emitEvent)
    const helperRegistry = createNormalChatHelperLibrary({
      paperRetrievalService: this.paperRetrievalService
    })
    const providerProfile = await this.llmClient.getProviderProfile(provider.providerId, signal)
    baseMetrics.providerName = providerProfile?.name ?? null
    const services: NormalChatAgentExecutionServices = {
      getConversationMessages: (topicId) => this.repository.listMessagesByTopicId(topicId),
      createChatModel: async (providerId, modelId, currentSignal) => {
        baseMetrics.modelCallCount += 1
        if (traceState) {
          emitRuntimeTrace({
            ...traceState.runtimeTrace,
            metrics: { ...baseMetrics }
          })
        }
        return this.llmClient.createChatModel(providerId, modelId, currentSignal)
      },
      getProviderProtocol: (providerId, currentSignal) =>
        this.llmClient.getProviderProtocol(providerId, currentSignal),
      functioncallRegistry: helperRegistry,
      logger: log
    }
    const suite = createNormalChatAgentSuite()

    const treeStore = new NormalChatAgentTreeStore(
      requestId,
      assistant.maxRecursionDepth,
      (tree, summary) => {
        const nextRuntimeTrace = traceState?.runtimeTrace ?? {
          traceVersion: 1,
          agentTree: null,
          metrics: { ...baseMetrics },
          execution: null
        }

        emitRuntimeTrace(
          {
            ...nextRuntimeTrace,
            agentTree: tree,
            metrics: {
              ...(nextRuntimeTrace.metrics ?? baseMetrics),
              modelCallCount: Object.keys(tree.agents).length
            }
          },
          summary
        )
      }
    )
    const graph = suite.createGraph({ services })
    const sessionManager = new NormalChatAgentSessionManager(graph, services, treeStore, eventSink)

    try {
      traceState = this.createConversationTraceState({
        requestId,
        assistant,
        topic,
        providerId: provider.providerId,
        modelId: provider.modelId,
        input,
        systemPrompt: effectiveSystemPrompt,
        promptMessages: buildPromptMessagesFromConversation(
          this.repository.listMessagesByTopicId(topic.id)
        ),
        agentTree: null,
        metrics: { ...baseMetrics },
        streamingEnabled
      })

      if (traceState) {
        this.persistConversationTrace(traceState, 'insert')
        this.emit({
          type: 'turn-detail-upsert',
          requestId,
          topicId: topic.id
        })
      }

      this.emitStatus(requestId, topic.id, 'sending', '正在准备递归 agent 上下文…')
      this.emitStatus(requestId, topic.id, 'thinking', 'director 正在规划本轮执行…')

      const runResult = await sessionManager.runRootAgent({
        requestId,
        topicId: topic.id,
        assistantId: assistant.id,
        assistantTitle: assistant.name,
        topicTitle: topic.title,
        providerId: provider.providerId,
        modelId: provider.modelId,
        systemPrompt: effectiveSystemPrompt,
        input,
        signal,
        callMode: assistant.callMode,
        costMode: assistant.costMode,
        maxRecursionDepth: assistant.maxRecursionDepth,
        maxRetriesPerAgent: assistant.maxRetriesPerAgent
      })
      const preferredFinalAnswer = resolvePreferredFinalAnswer(
        runResult.agentTree,
        runResult.synthesisSummary
      )

      if (traceState) {
        traceState.requestRecord.promptMessages = runResult.rootSession.conversationWindow
        traceState.runtimeTrace.agentTree = runResult.agentTree
        traceState.runtimeTrace.metrics = {
          ...(traceState.runtimeTrace.metrics ?? baseMetrics),
          modelCallCount: Object.keys(runResult.agentTree.agents).length
        }
        this.persistConversationTrace(traceState, 'update')
        this.emit({
          type: 'turn-detail-upsert',
          requestId,
          topicId: topic.id
        })
      }

      this.emitStatus(requestId, topic.id, 'streaming', '模型正在生成最终回答…')
      const model = await services.createChatModel(provider.providerId, provider.modelId, signal)

      if (streamingEnabled) {
        const answerStream = await model.stream(runResult.answerMessages, { signal })

        for await (const chunk of answerStream) {
          if (signal.aborted) {
            break
          }

          const delta = this.extractChunkText(chunk)
          if (!delta) {
            continue
          }

          eventSink.emitFinalChunk(requestId, topic.id, delta)
        }
      } else {
        const response = await model.invoke(runResult.answerMessages, { signal })
        const fullText = extractTextContent(response.content)
        if (fullText) {
          eventSink.emitFinalChunk(requestId, topic.id, fullText)
        }
      }

      const finalAnswerText = assistantText.trim() || preferredFinalAnswer || '模型未返回文本内容。'
      if (!assistantText.trim() && preferredFinalAnswer) {
        log.warn(
          'Final answer stream returned empty text, falling back to root agent final result',
          {
            requestId,
            topicId: topic.id,
            assistantId: assistant.id
          }
        )
        assistantText = finalAnswerText
        currentTextSegment = finalAnswerText
        upsertAssistantTextPart(finalAnswerText, assistantTextPartIndex < 0)
      }

      if (signal.aborted) {
        if (traceState) {
          traceState.responseRecord.finalText = assistantText
          traceState.responseRecord.aborted = true
          traceState.responseRecord.completedAt = new Date().toISOString()
          this.persistConversationTrace(traceState, 'update')
        }

        const assistantMessageId = this.commitAssistantMessageIfNeeded(
          topic.id,
          requestId,
          assistantParts,
          assistantText
        )
        this.emit({
          type: 'finish',
          requestId,
          topicId: topic.id,
          assistantMessageId
        })
        return
      }

      if (traceState) {
        traceState.responseRecord.finalText = finalAnswerText
        traceState.responseRecord.completedAt = new Date().toISOString()
        this.persistConversationTrace(traceState, 'update')
        this.emit({
          type: 'turn-detail-upsert',
          requestId,
          topicId: topic.id
        })
      }

      const assistantMessage = this.createAssistantMessage(
        topic.id,
        requestId,
        assistantParts,
        finalAnswerText
      )
      const sortOrder = this.repository.listMessagesByTopicId(topic.id).length
      this.repository.insertMessage(assistantMessage, sortOrder)

      this.emit({
        type: 'message-committed',
        requestId,
        topicId: topic.id,
        message: assistantMessage
      })
      this.emitStatus(requestId, topic.id, 'done', '本轮回答已完成。')
      this.emit({
        type: 'finish',
        requestId,
        topicId: topic.id,
        assistantMessageId: assistantMessage.id
      })
    } catch (error) {
      if (traceState) {
        traceState.responseRecord.finalText = assistantText
        traceState.responseRecord.errorMessage =
          error instanceof Error ? error.message : String(error)
        traceState.responseRecord.completedAt = new Date().toISOString()
        traceState.runtimeTrace.agentTree = treeStore.getSnapshot()
        this.persistConversationTrace(traceState, 'update')
        this.emit({
          type: 'turn-detail-upsert',
          requestId,
          topicId: topic.id
        })
      }

      const rawErrorJson = serializeErrorDetails(error)
      this.commitAssistantMessageIfNeeded(topic.id, requestId, assistantParts, assistantText)
      this.emit({
        type: 'error',
        requestId,
        topicId: topic.id,
        message: error instanceof Error ? error.message : String(error),
        rawErrorJson
      })
    } finally {
      this.lifecycle.finalize(requestId)
    }
  }

  private createAssistantMessage(
    topicId: string,
    requestId: string,
    parts: NormalChatMessagePart[],
    text: string
  ): NormalChatConversationMessage {
    const now = new Date().toISOString()
    const nextParts = buildAssistantMessageParts(parts, text)
    return {
      id: randomUUID(),
      topicId,
      requestId,
      role: 'assistant',
      parts: nextParts,
      createdAt: now,
      updatedAt: now
    }
  }

  private commitAssistantMessageIfNeeded(
    topicId: string,
    requestId: string,
    parts: NormalChatMessagePart[],
    text: string
  ): string | null {
    const assistantText = text.trim()
    if (parts.length === 0 && !assistantText) {
      return null
    }

    const assistantMessage = this.createAssistantMessage(topicId, requestId, parts, assistantText)
    const sortOrder = this.repository.listMessagesByTopicId(topicId).length
    this.repository.insertMessage(assistantMessage, sortOrder)

    this.emit({
      type: 'message-committed',
      requestId,
      topicId,
      message: assistantMessage
    })

    return assistantMessage.id
  }

  private persistConversationTrace(
    traceState: ConversationTraceState,
    mode: 'insert' | 'update'
  ): void {
    const payload = {
      requestId: traceState.requestId,
      topicId: traceState.topicId,
      assistantId: traceState.assistantId,
      assistantName: traceState.assistantName,
      assistantEmoji: traceState.assistantEmoji,
      topicTitle: traceState.topicTitle,
      saveFullConversationEnabled: traceState.saveFullConversationEnabled,
      hasTrace: true,
      requestRecord: traceState.requestRecord,
      responseRecord: traceState.responseRecord,
      runtimeTrace: traceState.runtimeTrace,
      messages: []
    }

    if (mode === 'insert') {
      this.repository.insertConversationTurnTrace(payload)
      return
    }

    this.repository.updateConversationTurnTrace(payload)
  }

  private createConversationTraceState(params: {
    requestId: string
    assistant: {
      id: string
      name: string
      emoji: string
      defaultSystemPrompt: string
      saveFullConversationEnabled: boolean
      streamingEnabled: boolean
      callMode: 'fast' | 'slow' | 'auto'
      costMode: 'per_call' | 'per_token'
      maxRecursionDepth: number
      maxRetriesPerAgent: number
    }
    topic: {
      id: string
      title: string
      systemPromptMode: 'inherit' | 'override'
      systemPromptOverride: string | null
      streamingMode: 'inherit' | 'override'
      streamingEnabledOverride: boolean | null
    }
    providerId: string
    modelId: string
    input: string
    systemPrompt: string
    promptMessages: NormalChatConversationTurnRequestRecord['promptMessages']
    agentTree: NormalChatConversationRuntimeTrace['agentTree']
    metrics: NormalChatRequestMetrics
    streamingEnabled: boolean
  }): ConversationTraceState | null {
    if (!params.assistant.saveFullConversationEnabled) {
      return null
    }

    return {
      requestId: params.requestId,
      topicId: params.topic.id,
      assistantId: params.assistant.id,
      assistantName: params.assistant.name,
      assistantEmoji: params.assistant.emoji,
      topicTitle: params.topic.title,
      saveFullConversationEnabled: true,
      requestRecord: {
        assistant: {
          id: params.assistant.id,
          name: params.assistant.name,
          emoji: params.assistant.emoji,
          defaultSystemPrompt: params.assistant.defaultSystemPrompt,
          saveFullConversationEnabled: params.assistant.saveFullConversationEnabled,
          streamingEnabled: params.assistant.streamingEnabled,
          callMode: params.assistant.callMode,
          costMode: params.assistant.costMode,
          maxRecursionDepth: params.assistant.maxRecursionDepth,
          maxRetriesPerAgent: params.assistant.maxRetriesPerAgent
        },
        topic: {
          id: params.topic.id,
          title: params.topic.title,
          systemPromptMode: params.topic.systemPromptMode,
          systemPromptOverride: params.topic.systemPromptOverride
        },
        providerId: params.providerId,
        modelId: params.modelId,
        streamingEnabled: params.streamingEnabled,
        input: params.input,
        effectiveSystemPrompt: params.systemPrompt,
        promptMessages: params.promptMessages
      },
      responseRecord: {
        chunks: [],
        finalText: '',
        aborted: false,
        errorMessage: null,
        completedAt: null
      },
      runtimeTrace: {
        traceVersion: 1,
        agentTree: params.agentTree,
        metrics: params.metrics,
        execution: null
      }
    }
  }

  private requireTopic(topicId: string): void {
    const topic = this.repository.getTopicById(topicId)
    if (!topic) {
      throw new Error(`话题不存在: ${topicId}`)
    }
  }

  private emit(event: NormalChatConversationStreamEvent): void {
    this.streamListeners.forEach((listener) => listener(event))
  }

  private emitStatus(
    requestId: string,
    topicId: string,
    phase: 'sending' | 'thinking' | 'streaming' | 'done',
    message: string
  ): void {
    this.emit({
      type: 'status',
      requestId,
      topicId,
      phase,
      message
    })
  }

  private extractChunkText(chunk: unknown): string {
    if (chunk instanceof AIMessageChunk) {
      if (typeof chunk.content === 'string') {
        return chunk.content
      }

      if (Array.isArray(chunk.content)) {
        return chunk.content
          .map((item) => {
            if (typeof item === 'string') {
              return item
            }

            if (
              typeof item === 'object' &&
              item &&
              'text' in item &&
              typeof item.text === 'string'
            ) {
              return item.text
            }

            return ''
          })
          .join('')
      }
    }

    if (typeof chunk === 'string') {
      return chunk
    }

    return ''
  }
}
