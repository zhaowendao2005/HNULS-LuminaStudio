import { randomUUID } from 'crypto'
import { AIMessageChunk } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogle } from '@langchain/google'
import {
  ChatOpenAI,
  ChatOpenAICompletions,
  type ClientOptions as OpenAIClientOptions
} from '@langchain/openai'
import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatConversationPromptMessage,
  NormalChatConversationTurnRequestPayload,
  NormalChatConversationTurnResponsePayload,
  NormalChatMessagePart,
  NormalChatSendMessageRequest,
  NormalChatTopic
} from '@preload/types'
import type { PaperRetrievalService } from '../../../paper-retrieval'
import type { DatabaseManager } from '../../../database-sqlite'
import type { ModelConfigService } from '../../../model-config'
import { logger } from '../../../logger'
import { NormalChatRepository } from '../../normal-chat.repository'
import { createNormalChatAgentGraph } from '../registry'
import type { NormalChatAgentRuntimeBridge } from '../Agents/base-chat-agent/graph'
import { executePubmedSearch } from '../Agents/base-chat-agent/functioncall/pubmed-search/execute'
import { createNormalChatTraceRecorder } from '../trace'
import type { NormalChatAgentTraceRecorder } from '../contracts'

interface ActiveRequestContext {
  topicId: string
  controller: AbortController
  settled: Promise<void>
  resolveSettled: () => void
  trace: NormalChatAgentTraceRecorder | null
}

interface ConversationTraceState {
  requestId: string
  topicId: string
  assistantId: string
  assistantName: string
  assistantEmoji: string
  topicTitle: string
  saveFullConversationEnabled: boolean
  requestPayload: NormalChatConversationTurnRequestPayload
  responsePayload: NormalChatConversationTurnResponsePayload
}

type SupportedChatModel = ChatOpenAI | ChatOpenAICompletions | ChatAnthropic | ChatGoogle

const log = logger.scope('NormalChatConversationService')

export class NormalChatConversationService {
  private readonly repository: NormalChatRepository
  private readonly streamListeners = new Set<(event: NormalChatConversationStreamEvent) => void>()
  private readonly activeRequests = new Map<string, ActiveRequestContext>()

  constructor(
    databaseManager: DatabaseManager,
    private readonly modelConfigService: ModelConfigService,
    private readonly paperRetrievalService: PaperRetrievalService
  ) {
    this.repository = new NormalChatRepository(databaseManager.getDatabase('userdata'))
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

  async sendMessage(
    payload: NormalChatSendMessageRequest
  ): Promise<{ requestId: string; messageId: string }> {
    const assistant = this.requireAssistant(payload.assistantId)
    const topic = this.requireTopic(payload.topicId, payload.assistantId)
    const trimmed = payload.input.trim()

    if (!trimmed) {
      throw new Error('Message is empty')
    }

    // 同一个服务里如果还有旧请求在跑，先让它们收口，避免串台。
    await this.abortAllActiveRequests('已有对话正在进行，已自动中止旧请求。')

    const requestId = payload.requestId || randomUUID()
    const controller = new AbortController()
    let resolveSettled: () => void = () => undefined
    const settled = new Promise<void>((resolve) => {
      resolveSettled = resolve
    })

    this.activeRequests.set(requestId, {
      topicId: topic.id,
      controller,
      settled,
      resolveSettled,
      trace: null
    })

    const now = new Date().toISOString()
    const userMessage: NormalChatConversationMessage = {
      id: payload.messageId,
      topicId: topic.id,
      requestId,
      role: 'user',
      parts: this.createTextParts(trimmed),
      createdAt: now,
      updatedAt: now
    }
    const sortOrder = this.repository.listMessagesByTopicId(topic.id).length
    this.repository.insertMessage(userMessage, sortOrder)

    // 用户消息先落库，再通知前端，界面就能立刻看到输入内容。
    this.emit({
      type: 'message-committed',
      requestId,
      topicId: topic.id,
      message: userMessage
    })
    this.emitStatus(requestId, topic.id, 'sending', '用户消息已写入，正在准备模型上下文…')

    void this.runConversation({
      requestId,
      assistant,
      topic,
      providerId: payload.providerId,
      modelId: payload.modelId,
      systemPrompt: payload.effectiveSystemPrompt,
      input: trimmed,
      signal: controller.signal
    })

    return { requestId, messageId: userMessage.id }
  }

  async abort(requestId: string): Promise<void> {
    const active = this.activeRequests.get(requestId)
    if (!active) {
      return
    }

    // 先发中断信号，再等待运行时把已开始的流程收口。
    active.controller.abort()
    await active.settled
  }

  private async runConversation(params: {
    requestId: string
    assistant: NormalChatAssistant
    topic: NormalChatTopic
    providerId: string
    modelId: string
    systemPrompt: string
    input: string
    signal: AbortSignal
  }): Promise<void> {
    const { requestId, assistant, topic, providerId, modelId, systemPrompt, input, signal } = params
    const traceRecorder = createNormalChatTraceRecorder()
    const graph = createNormalChatAgentGraph(assistant.templateKey, {
      runtime: this.createGraphRuntimeBridge(),
      trace: traceRecorder
    })

    if (!graph) {
      throw new Error(`不支持的助手图谱: ${assistant.templateKey}`)
    }

    let traceState: ConversationTraceState | null = null
    let assistantText = ''
    let graphCompleted = false

    try {
      this.throwIfAborted(signal)
      this.emitStatus(requestId, topic.id, 'thinking', '正在整理上下文并调用图谱…')

      const graphResult = await graph.run({
        requestId,
        topicId: topic.id,
        assistantId: assistant.id,
        assistantTitle: assistant.name,
        topicTitle: topic.title,
        providerId,
        modelId,
        systemPrompt,
        input,
        signal
      })
      graphCompleted = true

      traceState = this.createConversationTraceState({
        requestId,
        assistant,
        topic,
        providerId,
        modelId,
        input,
        systemPrompt,
        promptMessages: graphResult.promptMessages
      })

      if (traceState) {
        this.persistConversationTrace(traceState, 'insert')
      }

      traceRecorder.record({
        type: 'answer-start',
        requestId,
        topicId: topic.id,
        message: '开始生成最终回答'
      })
      this.emitStatus(requestId, topic.id, 'streaming', '模型正在输出回答…')

      const model = await this.createChatModel(providerId, modelId, signal)
      const answerStream = await model.stream(graphResult.answerMessages, { signal })

      for await (const chunk of answerStream) {
        if (signal.aborted) {
          break
        }

        const delta = this.extractChunkText(chunk)
        if (!delta) {
          continue
        }

        assistantText += delta
        traceRecorder.record({
          type: 'answer-delta',
          requestId,
          topicId: topic.id,
          delta
        })

        this.emit({
          type: 'assistant-chunk',
          requestId,
          topicId: topic.id,
          delta
        })

        if (traceState) {
          traceState.responsePayload.chunks.push(delta)
          traceState.responsePayload.finalText = assistantText
          this.persistConversationTrace(traceState, 'update')
        }
      }

      const finalAnswerText = assistantText.trim() || '模型未返回文本内容。'

      if (signal.aborted) {
        if (traceState) {
          traceState.responsePayload.finalText = assistantText
          traceState.responsePayload.aborted = true
          traceState.responsePayload.completedAt = new Date().toISOString()
          this.persistConversationTrace(traceState, 'update')
        }

        const assistantMessageId = this.commitAssistantMessageIfNeeded(
          topic.id,
          requestId,
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
        traceState.responsePayload.finalText = finalAnswerText
        traceState.responsePayload.aborted = false
        traceState.responsePayload.completedAt = new Date().toISOString()
        this.persistConversationTrace(traceState, 'update')
      }

      traceRecorder.record({
        type: 'run-finish',
        requestId,
        topicId: topic.id,
        output: finalAnswerText,
        message: 'BaseChatAgentGraph 执行结束'
      })

      const assistantMessage = this.createAssistantMessage(topic.id, requestId, finalAnswerText)
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
      if (signal.aborted) {
        if (traceState) {
          traceState.responsePayload.finalText = assistantText
          traceState.responsePayload.aborted = true
          traceState.responsePayload.completedAt = new Date().toISOString()
          this.persistConversationTrace(traceState, 'update')
        }

        const assistantMessageId = this.commitAssistantMessageIfNeeded(
          topic.id,
          requestId,
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

      const message = error instanceof Error ? error.message : String(error)

      // graph 已经负责前半段错误埋点，这里只补最终流式阶段的错误。
      if (graphCompleted) {
        traceRecorder.record({
          type: 'run-error',
          requestId,
          topicId: topic.id,
          error: message,
          message: 'BaseChatAgentGraph 执行失败'
        })
      }

      if (traceState) {
        traceState.responsePayload.finalText = assistantText
        traceState.responsePayload.aborted = false
        traceState.responsePayload.errorMessage = message
        traceState.responsePayload.completedAt = new Date().toISOString()
        this.persistConversationTrace(traceState, 'update')
      }

      this.emit({
        type: 'error',
        requestId,
        topicId: topic.id,
        message
      })
    } finally {
      const active = this.activeRequests.get(requestId)
      if (active) {
        active.resolveSettled()
      }
      this.activeRequests.delete(requestId)
    }
  }

  private createGraphRuntimeBridge(): NormalChatAgentRuntimeBridge {
    return {
      getConversationMessages: (topicId) => this.repository.listMessagesByTopicId(topicId),
      createChatModel: (providerId, modelId, signal) =>
        this.createChatModel(providerId, modelId, signal),
      executePubmedSearch: (args, context) =>
        executePubmedSearch(args, {
          signal: context.signal,
          trace: context.trace,
          runContext: context.runContext,
          modelContext: context.modelContext,
          logger: log,
          paperRetrievalService: this.paperRetrievalService
        })
    }
  }

  private createTextParts(text: string): NormalChatMessagePart[] {
    return [{ kind: 'text', text }]
  }

  private createAssistantMessage(
    topicId: string,
    requestId: string,
    text: string
  ): NormalChatConversationMessage {
    const now = new Date().toISOString()
    return {
      id: randomUUID(),
      topicId,
      requestId,
      role: 'assistant',
      parts: this.createTextParts(text || '模型未返回文本内容。'),
      createdAt: now,
      updatedAt: now
    }
  }

  private commitAssistantMessageIfNeeded(
    topicId: string,
    requestId: string,
    text: string
  ): string | null {
    const assistantText = text.trim()
    if (!assistantText) {
      return null
    }

    const assistantMessage = this.createAssistantMessage(topicId, requestId, assistantText)
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
      requestPayload: traceState.requestPayload,
      responsePayload: {
        chunks: [...traceState.responsePayload.chunks],
        finalText: traceState.responsePayload.finalText,
        aborted: traceState.responsePayload.aborted,
        errorMessage: traceState.responsePayload.errorMessage,
        completedAt: traceState.responsePayload.completedAt
      },
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
    assistant: NormalChatAssistant
    topic: NormalChatTopic
    providerId: string
    modelId: string
    input: string
    systemPrompt: string
    promptMessages: NormalChatConversationPromptMessage[]
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
      requestPayload: {
        assistant: {
          id: params.assistant.id,
          name: params.assistant.name,
          emoji: params.assistant.emoji,
          templateKey: params.assistant.templateKey,
          defaultSystemPrompt: params.assistant.defaultSystemPrompt,
          saveFullConversationEnabled: params.assistant.saveFullConversationEnabled
        },
        topic: {
          id: params.topic.id,
          title: params.topic.title,
          systemPromptMode: params.topic.systemPromptMode,
          systemPromptOverride: params.topic.systemPromptOverride
        },
        providerId: params.providerId,
        modelId: params.modelId,
        input: params.input,
        effectiveSystemPrompt: params.systemPrompt,
        promptMessages: params.promptMessages
      },
      responsePayload: {
        chunks: [],
        finalText: '',
        aborted: false,
        errorMessage: null,
        completedAt: null
      }
    }
  }

  private async createChatModel(
    providerId: string,
    modelId: string,
    signal: AbortSignal
  ): Promise<SupportedChatModel> {
    // 配置加载也要支持中断，避免用户点停止后还卡在 provider 读取阶段。
    const config = await this.awaitWithAbort(signal, this.modelConfigService.getConfig())
    this.throwIfAborted(signal)

    const provider = config.providers.find((item) => item.id === providerId && item.enabled)
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`)
    }

    if (provider.protocol === 'claude') {
      return new ChatAnthropic({
        model: modelId,
        apiKey: provider.apiKey,
        anthropicApiUrl: provider.baseUrl || undefined
      })
    }

    if (provider.protocol === 'gemini') {
      const geminiConfig = this.parseGeminiBaseUrl(provider.baseUrl)
      return new ChatGoogle({
        model: modelId,
        apiKey: provider.apiKey,
        endpoint: geminiConfig.endpoint,
        apiVersion: geminiConfig.apiVersion
      })
    }

    const configuration: OpenAIClientOptions | undefined = provider.baseUrl
      ? { baseURL: provider.baseUrl }
      : undefined

    if (provider.protocol === 'openai-response' || provider.protocol === 'openai') {
      // 这里统一走 ChatOpenAI 的 Responses 模式，不直接依赖低层 Responses 包装。
      // 这样 graph 里做结构化规划时，流事件和 function calling 的兼容性更稳。
      return new ChatOpenAI({
        model: modelId,
        apiKey: provider.apiKey,
        configuration,
        useResponsesApi: true
      })
    }

    if (provider.protocol === 'openai-completion') {
      return new ChatOpenAICompletions({
        model: modelId,
        apiKey: provider.apiKey,
        configuration
      })
    }

    return new ChatOpenAI({
      model: modelId,
      apiKey: provider.apiKey,
      configuration
    })
  }

  private async awaitWithAbort<T>(signal: AbortSignal, task: Promise<T>): Promise<T> {
    this.throwIfAborted(signal)

    let rejectAbort: ((error: Error) => void) | null = null
    const onAbort = () => {
      rejectAbort?.(this.createAbortError())
    }
    const abortPromise = new Promise<never>((_, reject) => {
      rejectAbort = reject
      signal.addEventListener('abort', onAbort, { once: true })
    })

    try {
      return await Promise.race([task, abortPromise])
    } finally {
      signal.removeEventListener('abort', onAbort)
    }
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (!signal.aborted) {
      return
    }

    throw this.createAbortError()
  }

  private createAbortError(): Error {
    const error = new Error('请求已中止')
    error.name = 'AbortError'
    return error
  }

  private parseGeminiBaseUrl(baseUrl: string): { endpoint?: string; apiVersion?: string } {
    if (!baseUrl) {
      return {}
    }

    try {
      const url = new URL(baseUrl)
      const parts = url.pathname.split('/').filter(Boolean)
      const apiVersion = parts[0]
      return {
        endpoint: url.host,
        apiVersion
      }
    } catch {
      return {}
    }
  }

  private requireAssistant(assistantId: string): NormalChatAssistant {
    const assistant = this.repository.getAssistantById(assistantId)
    if (!assistant) {
      throw new Error(`助手不存在: ${assistantId}`)
    }

    return assistant
  }

  private requireTopic(topicId: string, assistantId?: string): NormalChatTopic {
    const topic = this.repository.getTopicById(topicId)
    if (!topic) {
      throw new Error(`话题不存在: ${topicId}`)
    }

    if (assistantId && topic.assistantId !== assistantId) {
      throw new Error(`话题不属于当前助手: ${topicId}`)
    }

    return topic
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

  private async abortAllActiveRequests(note: string): Promise<void> {
    if (this.activeRequests.size === 0) {
      return
    }

    const activeRequests = [...this.activeRequests.entries()]
    for (const [requestId, active] of activeRequests) {
      log.debug('Aborting active normal chat request before starting a new one', {
        requestId,
        topicId: active.topicId,
        note
      })
      active.controller.abort()
    }

    // 等待每个请求自己收口，避免把还没来得及写回的内容直接丢掉。
    await Promise.all(activeRequests.map(([, active]) => active.settled))
  }
}
