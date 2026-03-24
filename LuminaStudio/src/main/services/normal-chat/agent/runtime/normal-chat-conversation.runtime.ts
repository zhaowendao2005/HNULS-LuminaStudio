import { randomUUID } from 'crypto'
import { AIMessageChunk } from '@langchain/core/messages'
import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatConversationSnapshot,
  NormalChatConversationStreamEvent,
  NormalChatConversationPromptMessage,
  NormalChatConversationTurnRequestPayload,
  NormalChatConversationTurnResponsePayload,
  NormalChatFunctionCallMessagePart,
  NormalChatMessagePart,
  NormalChatSendMessageRequest,
  NormalChatTopic
} from '@preload/types'
import type { PaperRetrievalService } from '../../../paper-retrieval'
import type { DatabaseManager } from '../../../database-sqlite'
import { logger } from '../../../logger'
import { NormalChatRepository } from '../../normal-chat.repository'
import type { NormalChatLlmClient } from '../../llm-client'
import { createNormalChatAgentSuite } from '../registry'
import { createNormalChatTraceRecorder } from '../trace'
import type { NormalChatAgentGraphRuntimeBridge, NormalChatAgentTraceRecorder } from '../contracts'

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

interface ModelInvocationContext {
  providerId: string
  modelId: string
  signal: AbortSignal
}

function extractHttpStatusFromError(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const candidates = [
    (error as { status?: unknown }).status,
    (error as { statusCode?: unknown }).statusCode,
    (error as { code?: unknown }).code,
    (error as { response?: { status?: unknown; statusCode?: unknown } }).response?.status,
    (error as { response?: { status?: unknown; statusCode?: unknown } }).response?.statusCode,
    (error as { cause?: unknown }).cause
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate
    }
    if (typeof candidate === 'string') {
      const httpMatch = candidate.match(/HTTP[_\s:-]*(\d{3})/i)
      if (httpMatch?.[1]) {
        return Number(httpMatch[1])
      }
      if (/^\d{3}$/.test(candidate)) {
        return Number(candidate)
      }
    }
    if (candidate && typeof candidate === 'object') {
      const nested = extractHttpStatusFromError(candidate)
      if (nested) {
        return nested
      }
    }
  }

  const rawMessage = error instanceof Error ? error.message : String(error)
  const messageMatch = rawMessage.match(/\b(4\d{2}|5\d{2})\b/)
  return messageMatch?.[1] ? Number(messageMatch[1]) : null
}

function formatUpstreamHttpError(error: unknown, fallbackMessage: string): string {
  const status = extractHttpStatusFromError(error)
  if (!status) {
    return fallbackMessage
  }

  const rawMessage = error instanceof Error ? error.message : String(error)
  const statusTextMatch = rawMessage.match(
    /\b(?:HTTP\s*)?(4\d{2}|5\d{2})[:\s-]*([A-Za-z][A-Za-z\s-]{2,})?/i
  )
  const statusText = statusTextMatch?.[2]?.trim()

  if (statusText) {
    return `上游请求失败：HTTP ${status} ${statusText}`
  }

  return `上游请求失败：HTTP ${status}`
}

const log = logger.scope('NormalChatConversationService')

export class NormalChatConversationService {
  private readonly repository: NormalChatRepository
  private readonly streamListeners = new Set<(event: NormalChatConversationStreamEvent) => void>()
  private readonly activeRequests = new Map<string, ActiveRequestContext>()

  constructor(
    databaseManager: DatabaseManager,
    private readonly llmClient: NormalChatLlmClient,
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
    const suite = createNormalChatAgentSuite(assistant.templateKey)

    if (!suite) {
      throw new Error(`不支持的助手图谱: ${assistant.templateKey}`)
    }

    const graph = suite.createGraph({
      runtime: this.createGraphRuntimeBridge(),
      trace: traceRecorder,
      hostDependencies: {
        paperRetrievalService: this.paperRetrievalService
      }
    })

    let traceState: ConversationTraceState | null = null
    const assistantParts: NormalChatMessagePart[] = []
    const functionCallPartIndexByCallId = new Map<string, number>()
    let assistantText = ''
    let assistantTextPartIndex = -1
    let currentTextSegment = ''
    let shouldStartNewTextSegment = false
    let graphCompleted = false

    const markNextTextSegmentStart = (): void => {
      // 只要出现工具调用，后续文本就应该切到新的段落，形成“文本-工具调用-文本”的批次结构。
      shouldStartNewTextSegment = true
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

    const upsertFunctionCallPart = (part: NormalChatFunctionCallMessagePart): void => {
      const currentIndex = functionCallPartIndexByCallId.get(part.callId)
      const existingPart =
        currentIndex !== undefined
          ? (assistantParts[currentIndex] as NormalChatFunctionCallMessagePart | undefined)
          : undefined
      const nextPart: NormalChatFunctionCallMessagePart = existingPart
        ? {
            ...existingPart,
            ...part,
            input: part.input !== '' ? part.input : existingPart.input,
            output: part.output !== '' ? part.output : existingPart.output,
            errorMessage: part.errorMessage ?? existingPart.errorMessage,
            isStreaming: part.isStreaming ?? existingPart.isStreaming
          }
        : {
            kind: 'functioncall',
            callId: part.callId,
            functionCallName: part.functionCallName,
            title: part.title,
            status: part.status,
            input: part.input ?? '',
            output: part.output ?? '',
            errorMessage: part.errorMessage ?? null,
            isStreaming: part.isStreaming ?? true
          }

      if (currentIndex !== undefined) {
        assistantParts[currentIndex] = nextPart
        return
      }

      functionCallPartIndexByCallId.set(part.callId, assistantParts.push(nextPart) - 1)
    }

    const disposeTraceSubscription = traceRecorder.subscribe((event) => {
      if (event.type === 'functioncall-start') {
        markNextTextSegmentStart()
        upsertFunctionCallPart({
          kind: 'functioncall',
          callId: event.callId,
          functionCallName: event.functionCallName,
          title: event.title,
          status: 'running',
          input: '',
          output: '',
          errorMessage: null,
          isStreaming: true
        })
        this.emit({
          type: 'assistant-part-upsert',
          requestId,
          topicId: topic.id,
          part: {
            kind: 'functioncall',
            callId: event.callId,
            functionCallName: event.functionCallName,
            title: event.title,
            status: 'running',
            input: '',
            output: '',
            errorMessage: null,
            isStreaming: true
          }
        })
        return
      }

      if (event.type === 'functioncall-input') {
        markNextTextSegmentStart()
        upsertFunctionCallPart({
          kind: 'functioncall',
          callId: event.callId,
          functionCallName: event.functionCallName,
          title: event.title,
          status: 'running',
          input: event.input,
          output: '',
          errorMessage: null,
          isStreaming: true
        })
        this.emit({
          type: 'assistant-part-upsert',
          requestId,
          topicId: topic.id,
          part: {
            kind: 'functioncall',
            callId: event.callId,
            functionCallName: event.functionCallName,
            title: event.title,
            status: 'running',
            input: event.input,
            output: '',
            errorMessage: null,
            isStreaming: true
          }
        })
        return
      }

      if (event.type === 'functioncall-output') {
        markNextTextSegmentStart()
        upsertFunctionCallPart({
          kind: 'functioncall',
          callId: event.callId,
          functionCallName: event.functionCallName,
          title: event.title,
          status: 'running',
          input: '',
          output: event.output,
          errorMessage: null,
          isStreaming: true
        })
        this.emit({
          type: 'assistant-part-upsert',
          requestId,
          topicId: topic.id,
          part: {
            kind: 'functioncall',
            callId: event.callId,
            functionCallName: event.functionCallName,
            title: event.title,
            status: 'running',
            input: '',
            output: event.output,
            errorMessage: null,
            isStreaming: true
          }
        })
        return
      }

      if (event.type === 'functioncall-finish') {
        markNextTextSegmentStart()
        const status = event.status === 'aborted' ? 'aborted' : 'success'
        upsertFunctionCallPart({
          kind: 'functioncall',
          callId: event.callId,
          functionCallName: event.functionCallName,
          title: event.title,
          status,
          input: '',
          output: '',
          errorMessage: null,
          isStreaming: false
        })
        this.emit({
          type: 'assistant-part-upsert',
          requestId,
          topicId: topic.id,
          part: {
            kind: 'functioncall',
            callId: event.callId,
            functionCallName: event.functionCallName,
            title: event.title,
            status,
            input: '',
            output: '',
            errorMessage: null,
            isStreaming: false
          }
        })
        return
      }

      if (event.type === 'functioncall-error') {
        markNextTextSegmentStart()
        upsertFunctionCallPart({
          kind: 'functioncall',
          callId: event.callId,
          functionCallName: event.functionCallName,
          title: event.title,
          status: 'error',
          input: '',
          output: '',
          errorMessage: event.error,
          isStreaming: false
        })
        this.emit({
          type: 'assistant-part-upsert',
          requestId,
          topicId: topic.id,
          part: {
            kind: 'functioncall',
            callId: event.callId,
            functionCallName: event.functionCallName,
            title: event.title,
            status: 'error',
            input: '',
            output: '',
            errorMessage: event.error,
            isStreaming: false
          }
        })
      }
    })

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

      const model = await this.llmClient.createChatModel(providerId, modelId, signal)
      const answerStream = await model.stream(graphResult.answerMessages, { signal })

      for await (const chunk of answerStream) {
        if (signal.aborted) {
          break
        }

        const delta = this.extractChunkText(chunk)
        if (!delta) {
          continue
        }

        const shouldCreateNewSegment = shouldStartNewTextSegment || assistantTextPartIndex < 0
        if (shouldCreateNewSegment) {
          currentTextSegment = ''
        }
        currentTextSegment += delta
        assistantText += delta
        upsertAssistantTextPart(currentTextSegment, shouldCreateNewSegment)
        shouldStartNewTextSegment = false
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

      const message = await this.normalizeModelInvocationErrorMessage(error, {
        providerId,
        modelId,
        signal
      })

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

      this.commitAssistantMessageIfNeeded(topic.id, requestId, assistantParts, assistantText)

      this.emit({
        type: 'error',
        requestId,
        topicId: topic.id,
        message
      })
    } finally {
      disposeTraceSubscription()
      const active = this.activeRequests.get(requestId)
      if (active) {
        active.resolveSettled()
      }
      this.activeRequests.delete(requestId)
    }
  }

  private createGraphRuntimeBridge(): NormalChatAgentGraphRuntimeBridge {
    return {
      getConversationMessages: (topicId) => this.repository.listMessagesByTopicId(topicId),
      createChatModel: (providerId, modelId, signal) =>
        this.llmClient.createChatModel(providerId, modelId, signal),
      getProviderProtocol: async (providerId, signal) => {
        const profile = await this.llmClient.getProviderProfile(providerId, signal)
        return profile?.protocol ?? null
      },
      invokeStructuredOutput: (params) => this.llmClient.invokeStructuredOutput(params),
      logger: log
    }
  }

  private createTextParts(text: string): NormalChatMessagePart[] {
    return [{ kind: 'text', text }]
  }

  private createAssistantMessage(
    topicId: string,
    requestId: string,
    parts: NormalChatMessagePart[],
    text: string
  ): NormalChatConversationMessage {
    const now = new Date().toISOString()
    const nextParts =
      parts.length > 0 ? parts : this.createTextParts(text || '模型未返回文本内容。')
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

  private async normalizeModelInvocationErrorMessage(
    error: unknown,
    context: ModelInvocationContext
  ): Promise<string> {
    const rawMessage = error instanceof Error ? error.message : String(error)
    const upstreamMessage = formatUpstreamHttpError(error, rawMessage)
    if (upstreamMessage !== rawMessage) {
      return upstreamMessage
    }

    if (!rawMessage.includes("Cannot read properties of undefined (reading 'message')")) {
      return rawMessage
    }

    // 这类报错常见于上游网关返回了非预期错误格式（例如 HTML 或非标准 JSON）。
    // 这里补充 provider 协议和 baseUrl，方便快速判断是否“协议与端点不匹配”。
    try {
      const provider = await this.llmClient.getProviderProfile(context.providerId, context.signal)
      if (provider) {
        return (
          `模型调用失败：上游返回了非标准错误格式（${rawMessage}）。` +
          `当前 provider=${provider.name}(${provider.protocol})，baseUrl=${provider.baseUrl}，model=${context.modelId}。` +
          '请确认协议与端点匹配：openai-completion→/v1/chat/completions，' +
          'openai-response→/v1/responses，claude→Anthropic Messages API，gemini→Google Gemini API。'
        )
      }
    } catch {
      // 读取配置失败时回退到通用提示，避免吞掉原始异常。
    }

    return (
      `模型调用失败：上游返回了非标准错误格式（${rawMessage}）。` +
      `当前 providerId=${context.providerId}，model=${context.modelId}。` +
      '请检查 provider 协议与 baseUrl 是否匹配。'
    )
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
