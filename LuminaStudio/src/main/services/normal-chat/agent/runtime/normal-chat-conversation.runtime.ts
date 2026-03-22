import { randomUUID } from 'crypto'
import { HumanMessage, SystemMessage, AIMessage, AIMessageChunk } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogle } from '@langchain/google'
import {
  ChatOpenAI,
  ChatOpenAICompletions,
  ChatOpenAIResponses,
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
import type { DatabaseManager } from '../../../database-sqlite'
import type { ModelConfigService } from '../../../model-config'
import { logger } from '../../../logger'
import { NormalChatRepository } from '../../normal-chat.repository'

interface ActiveRequestContext {
  topicId: string
  controller: AbortController
  settled: Promise<void>
  resolveSettled: () => void
  trace: ConversationTraceState | null
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

type SupportedChatModel =
  | ChatOpenAI
  | ChatOpenAIResponses
  | ChatOpenAICompletions
  | ChatAnthropic
  | ChatGoogle

const log = logger.scope('NormalChatConversationService')
const DEFAULT_HISTORY_LIMIT = 12

export class NormalChatConversationService {
  private readonly repository: NormalChatRepository
  private readonly streamListeners = new Set<(event: NormalChatConversationStreamEvent) => void>()
  private readonly activeRequests = new Map<string, ActiveRequestContext>()

  constructor(
    databaseManager: DatabaseManager,
    private readonly modelConfigService: ModelConfigService
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

    // 如果同一个服务里还有旧请求在跑，先让它们自己收口，避免串台。
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

    // 用户消息一旦写入，就先通知前端更新，这样界面能尽快看到乐观结果。
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

    // 这里先发出中断信号，再等待运行时把已输出内容收口。
    // 这样 renderer 侧就能保留已经生成出来的文本，不会把半截回答直接丢掉。
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
    let assistantText = ''

    try {
      this.emitStatus(requestId, topic.id, 'thinking', '正在整理上下文并调用模型…')
      const model = await this.createChatModel(providerId, modelId)
      const conversationMessages = this.repository.listMessagesByTopicId(topic.id)
      const promptMessageRecords = this.buildPromptMessageRecords(
        systemPrompt,
        conversationMessages
      )
      const promptMessages = this.buildPromptMessages(promptMessageRecords)
      const traceState = this.createConversationTraceState({
        requestId,
        assistant,
        topic,
        providerId,
        modelId,
        input,
        systemPrompt,
        promptMessages: promptMessageRecords
      })
      const active = this.activeRequests.get(requestId)
      if (active) {
        active.trace = traceState
      }

      if (traceState) {
        this.repository.insertConversationTurnTrace({
          requestId,
          topicId: topic.id,
          assistantId: assistant.id,
          assistantName: assistant.name,
          assistantEmoji: assistant.emoji,
          topicTitle: topic.title,
          saveFullConversationEnabled: true,
          hasTrace: true,
          requestPayload: traceState.requestPayload,
          responsePayload: traceState.responsePayload,
          messages: []
        })
      }

      const stream = await model.stream(promptMessages, { signal })

      this.emitStatus(requestId, topic.id, 'streaming', '模型正在输出回答…')
      for await (const chunk of stream) {
        const delta = this.extractChunkText(chunk)
        if (!delta) {
          continue
        }

        assistantText += delta
        if (traceState) {
          traceState.responsePayload.chunks.push(delta)
          traceState.responsePayload.finalText = assistantText
          this.repository.updateConversationTurnTrace({
            requestId,
            topicId: topic.id,
            assistantId: assistant.id,
            assistantName: assistant.name,
            assistantEmoji: assistant.emoji,
            topicTitle: topic.title,
            saveFullConversationEnabled: true,
            hasTrace: true,
            requestPayload: traceState.requestPayload,
            responsePayload: traceState.responsePayload,
            messages: []
          })
        }
        this.emit({
          type: 'assistant-chunk',
          requestId,
          topicId: topic.id,
          delta
        })
      }

      const assistantMessage = this.createAssistantMessage(topic.id, requestId, assistantText)
      const sortOrder = this.repository.listMessagesByTopicId(topic.id).length
      this.repository.insertMessage(assistantMessage, sortOrder)

      this.emit({
        type: 'message-committed',
        requestId,
        topicId: topic.id,
        message: assistantMessage
      })
      this.emitStatus(requestId, topic.id, 'done', '本轮回答已完成。')
      if (traceState) {
        traceState.responsePayload.finalText = assistantText
        traceState.responsePayload.aborted = false
        traceState.responsePayload.completedAt = new Date().toISOString()
        this.repository.updateConversationTurnTrace({
          requestId,
          topicId: topic.id,
          assistantId: assistant.id,
          assistantName: assistant.name,
          assistantEmoji: assistant.emoji,
          topicTitle: topic.title,
          saveFullConversationEnabled: true,
          hasTrace: true,
          requestPayload: traceState.requestPayload,
          responsePayload: traceState.responsePayload,
          messages: []
        })
      }
      this.emit({
        type: 'finish',
        requestId,
        topicId: topic.id,
        assistantMessageId: assistantMessage.id
      })
    } catch (error) {
      if (signal.aborted) {
        const trimmedAssistantText = assistantText.trim()
        let assistantMessageId: string | null = null

        if (trimmedAssistantText) {
          const assistantMessage = this.createAssistantMessage(topic.id, requestId, assistantText)
          const sortOrder = this.repository.listMessagesByTopicId(topic.id).length
          this.repository.insertMessage(assistantMessage, sortOrder)

          this.emit({
            type: 'message-committed',
            requestId,
            topicId: topic.id,
            message: assistantMessage
          })
          assistantMessageId = assistantMessage.id
        }

        // 用户点“停止”时，不把它当成错误处理。
        // 已经生成出来的部分会落成正式 assistant 消息，后面的内容直接舍弃。
        if (traceState) {
          traceState.responsePayload.finalText = assistantText
          traceState.responsePayload.aborted = true
          traceState.responsePayload.completedAt = new Date().toISOString()
          this.repository.updateConversationTurnTrace({
            requestId,
            topicId: topic.id,
            assistantId: assistant.id,
            assistantName: assistant.name,
            assistantEmoji: assistant.emoji,
            topicTitle: topic.title,
            saveFullConversationEnabled: true,
            hasTrace: true,
            requestPayload: traceState.requestPayload,
            responsePayload: traceState.responsePayload,
            messages: []
          })
        }
        this.emit({
          type: 'finish',
          requestId,
          topicId: topic.id,
          assistantMessageId
        })
        return
      }

      const message = error instanceof Error ? error.message : String(error)
      if (traceState) {
        traceState.responsePayload.errorMessage = message
        traceState.responsePayload.completedAt = new Date().toISOString()
        this.repository.updateConversationTurnTrace({
          requestId,
          topicId: topic.id,
          assistantId: assistant.id,
          assistantName: assistant.name,
          assistantEmoji: assistant.emoji,
          topicTitle: topic.title,
          saveFullConversationEnabled: true,
          hasTrace: true,
          requestPayload: traceState.requestPayload,
          responsePayload: traceState.responsePayload,
          messages: []
        })
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

  private buildPromptMessages(
    promptMessageRecords: NormalChatConversationPromptMessage[]
  ): Array<SystemMessage | HumanMessage | AIMessage> {
    return promptMessageRecords.map((message) => {
      if (message.role === 'system') {
        return new SystemMessage(message.content)
      }

      if (message.role === 'assistant') {
        return new AIMessage(message.content)
      }

      return new HumanMessage(message.content)
    })
  }

  private buildPromptMessageRecords(
    systemPrompt: string,
    conversationMessages: NormalChatConversationMessage[]
  ): NormalChatConversationPromptMessage[] {
    const recentMessages = conversationMessages.slice(-DEFAULT_HISTORY_LIMIT)
    const recentHistory = recentMessages.flatMap((message) => {
      const text = this.extractMessageText(message)
      if (!text) {
        return []
      }

      return [
        {
          role: message.role as 'user' | 'assistant',
          content: text
        }
      ]
    })

    return [
      {
        role: 'system',
        content: [
          systemPrompt || '你是 LuminaStudio 内置的普通聊天助手。',
          '',
          '回答请直接、清晰、使用中文。',
          '如果上下文不足，请明确说明，不要编造。'
        ].join('\n')
      },
      ...recentHistory
    ]
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

  private extractMessageText(message: NormalChatConversationMessage): string {
    return message.parts
      .filter((part) => part.kind === 'text')
      .map((part) => part.text)
      .join('')
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

  private async createChatModel(providerId: string, modelId: string): Promise<SupportedChatModel> {
    const config = await this.modelConfigService.getConfig()
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
      return new ChatOpenAIResponses({
        model: modelId,
        apiKey: provider.apiKey,
        configuration
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

    // 等待每个请求自己完成收口，避免把还没来得及写回的内容直接删掉。
    await Promise.all(activeRequests.map(([, active]) => active.settled))
  }
}
