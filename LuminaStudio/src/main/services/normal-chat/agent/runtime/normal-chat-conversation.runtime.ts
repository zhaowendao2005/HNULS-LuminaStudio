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
    this.requireAssistant(payload.assistantId)
    const topic = this.requireTopic(payload.topicId, payload.assistantId)
    const trimmed = payload.input.trim()

    if (!trimmed) {
      throw new Error('Message is empty')
    }

    // 第一版严格保持全局单活跃请求。
    await this.abortAllActiveRequests('已有对话正在进行，已自动中止旧请求。')

    const requestId = payload.requestId || randomUUID()
    const controller = new AbortController()
    this.activeRequests.set(requestId, { topicId: topic.id, controller })

    const now = new Date().toISOString()
    const userMessage: NormalChatConversationMessage = {
      id: payload.messageId,
      topicId: topic.id,
      role: 'user',
      parts: this.createTextParts(trimmed),
      createdAt: now,
      updatedAt: now
    }
    const sortOrder = this.repository.listMessagesByTopicId(topic.id).length
    this.repository.insertMessage(userMessage, sortOrder)

    // 用户消息一旦收到就立即确认，便于 renderer 端做乐观更新后的收口。
    this.emit({
      type: 'message-committed',
      requestId,
      topicId: topic.id,
      message: userMessage
    })
    this.emitStatus(requestId, topic.id, 'sending', '用户消息已写入，正在准备模型上下文…')

    void this.runConversation({
      requestId,
      topic,
      providerId: payload.providerId,
      modelId: payload.modelId,
      systemPrompt: payload.effectiveSystemPrompt,
      signal: controller.signal
    }).finally(() => {
      this.activeRequests.delete(requestId)
    })

    return { requestId, messageId: userMessage.id }
  }

  async abort(requestId: string): Promise<void> {
    const active = this.activeRequests.get(requestId)
    if (!active) {
      return
    }

    // 这里直接中断流式请求，不再继续写入 assistant 的 partial 内容。
    active.controller.abort()
    this.activeRequests.delete(requestId)
  }

  private async runConversation(params: {
    requestId: string
    topic: NormalChatTopic
    providerId: string
    modelId: string
    systemPrompt: string
    signal: AbortSignal
  }): Promise<void> {
    const { requestId, topic, providerId, modelId, systemPrompt, signal } = params

    try {
      this.emitStatus(requestId, topic.id, 'thinking', '正在整理上下文并调用模型…')
      const model = await this.createChatModel(providerId, modelId)
      const conversationMessages = this.repository.listMessagesByTopicId(topic.id)
      const promptMessages = this.buildPromptMessages(systemPrompt, conversationMessages)
      const stream = await model.stream(promptMessages, { signal })

      this.emitStatus(requestId, topic.id, 'streaming', '模型正在输出回答…')
      let assistantText = ''
      for await (const chunk of stream) {
        const delta = this.extractChunkText(chunk)
        if (!delta) {
          continue
        }

        assistantText += delta
        this.emit({
          type: 'assistant-chunk',
          requestId,
          topicId: topic.id,
          delta
        })
      }

      const now = new Date().toISOString()
      const assistantMessage: NormalChatConversationMessage = {
        id: randomUUID(),
        topicId: topic.id,
        role: 'assistant',
        parts: this.createTextParts(assistantText || '模型未返回文本内容。'),
        createdAt: now,
        updatedAt: now
      }
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
      const message =
        signal.aborted && error instanceof Error
          ? '对话已中止。'
          : error instanceof Error
            ? error.message
            : String(error)
      this.emit({
        type: 'error',
        requestId,
        topicId: topic.id,
        message
      })
    }
  }

  private buildPromptMessages(
    systemPrompt: string,
    conversationMessages: NormalChatConversationMessage[]
  ): Array<SystemMessage | HumanMessage | AIMessage> {
    const recentMessages = conversationMessages.slice(-DEFAULT_HISTORY_LIMIT)
    const historyMessages = recentMessages.flatMap((message) => {
      const text = this.extractMessageText(message)
      if (!text) {
        return []
      }

      return message.role === 'user' ? [new HumanMessage(text)] : [new AIMessage(text)]
    })

    return [
      new SystemMessage(
        [
          systemPrompt || '你是 LuminaStudio 内置的普通聊天助手。',
          '',
          '回答请直接、清晰、使用中文。',
          '如果上下文不足，请明确说明，不要编造。'
        ].join('\n')
      ),
      ...historyMessages
    ]
  }

  private createTextParts(text: string): NormalChatMessagePart[] {
    return [{ kind: 'text', text }]
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

    for (const [requestId, active] of this.activeRequests) {
      log.debug('Aborting active normal chat request before starting a new one', {
        requestId,
        topicId: active.topicId,
        note
      })
      active.controller.abort()
      this.activeRequests.delete(requestId)
    }
  }
}
