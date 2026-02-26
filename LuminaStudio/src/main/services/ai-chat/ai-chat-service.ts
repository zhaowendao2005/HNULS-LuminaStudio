import type Database from 'better-sqlite3'
import type { WebContents } from 'electron'
import { randomUUID } from 'crypto'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, wrapLanguageModel, extractReasoningMiddleware } from 'ai'
import type { LanguageModel } from 'ai'
import { logger } from '../logger'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelConfigService } from '../model-config'
import type { LangchainClientBridgeService } from '../langchain-client-bridge'
import type { AiChatRetrievalConfig, AiChatStreamEvent } from '@preload/types'
import type {
  KnowledgeQaModelConfig,
  LangchainClientAgentCreateConfig,
  LangchainClientChatMessage,
  LangchainClientRetrievalConfig,
  LangchainClientToMainMessage
} from '@shared/langchain-client.types'
import type {
  StreamState,
  MessageRow,
  AgentRow,
  ConversationSummaryRow,
  ConversationRow
} from './types'

const log = logger.scope('AiChatService')

/**
 * AiChatService
 *
 * AI 对话流式生成核心业务逻辑
 * 职责：
 * - 从现有 ModelConfigService 读取 provider/model 配置
 * - 使用 Vercel AI SDK 进行流式生成
 * - 持久化对话/消息/thinking/usage 到 userdata.db
 * - 管理 AbortController 与并发控制
 */
export class AiChatService {
  private db: Database.Database
  private activeStreams = new Map<string, StreamState>()
  private abortedAgentRequests = new Set<string>()
  private pendingAbortRequests = new Set<string>()

  constructor(
    databaseManager: DatabaseManager,
    private readonly modelConfigService: ModelConfigService,
    private readonly langchainClientBridge: LangchainClientBridgeService
  ) {
    this.db = databaseManager.getDatabase('userdata')
  }

  /**
   * 启动流式生成
   */
  async startStream(
    sender: WebContents,
    payload: {
      requestId?: string
      conversationId: string
      presetId: string
      providerId: string
      modelId: string
      input: string
      enableThinking?: boolean
      mode?: 'normal' | 'agent'
      retrieval?: AiChatRetrievalConfig
      providerOverride?: {
        baseUrl: string
        apiKey: string
        defaultHeaders?: Record<string, string>
      }
      agentModelConfig?: {
        knowledgeQa?: KnowledgeQaModelConfig
      }
    }
  ): Promise<{ requestId: string; conversationId: string }> {
    const requestId = payload.requestId ?? randomUUID()
    const { conversationId, presetId, providerId, modelId, input, enableThinking } = payload

    const mode = payload.mode ?? 'normal'

    log.info('Starting stream', {
      requestId,
      conversationId,
      presetId,
      providerId,
      modelId,
      mode,
      retrievalScopes: payload.retrieval?.scopes?.length ?? 0
    })

    if (mode === 'agent') {
      return await this.startAgentStream(sender, {
        requestId,
        conversationId,
        presetId,
        providerId,
        modelId,
        input,
        enableThinking: enableThinking ?? false,
        retrieval: payload.retrieval,
        providerOverride: payload.providerOverride,
        agentModelConfig: payload.agentModelConfig
      })
    }

    // 1. 确保 conversation 存在（如不存在则创建）
    await this.ensurePreset(presetId)
    await this.ensureConversation(conversationId, presetId, providerId, modelId)

    // 2. 创建 user message
    const userMessageId = randomUUID()
    this.insertMessage({
      id: userMessageId,
      conversation_id: conversationId,
      role: 'user',
      text: input,
      status: 'final'
    })

    // 3. 创建 assistant message（status='streaming'）
    const assistantMessageId = randomUUID()
    this.insertMessage({
      id: assistantMessageId,
      conversation_id: conversationId,
      role: 'assistant',
      status: 'streaming',
      text: null,
      reasoning: null
    })

    // 4. 构建 AI SDK model
    const model = await this.buildModel(providerId, modelId, enableThinking ?? false)

    // 5. 构建上下文（最近 10 轮 = 20 条 messages）
    const messages = await this.buildContext(conversationId, enableThinking ?? false)

    // 6. 创建 AbortController
    const abortController = new AbortController()
    const state: StreamState = {
      sender,
      requestId,
      conversationId,
      providerId,
      modelId,
      userMessageId,
      assistantMessageId,
      mode: 'normal',
      abortController,
      answerText: '',
      reasoningText: '',
      startedAt: new Date()
    }
    this.activeStreams.set(requestId, state)

    // 7. 发送 stream-start 事件
    this.sendEvent(sender, {
      type: 'stream-start',
      requestId,
      conversationId,
      providerId,
      modelId,
      startedAt: state.startedAt.toISOString()
    })
    if (this.pendingAbortRequests.has(requestId)) {
      this.pendingAbortRequests.delete(requestId)
      this.updateAssistantMessage(
        state.assistantMessageId,
        state.answerText,
        state.reasoningText,
        'aborted',
        'User aborted'
      )
      this.sendEvent(sender, {
        type: 'finish',
        requestId: state.requestId,
        finishReason: 'aborted',
        messageId: state.assistantMessageId
      })
      this.activeStreams.delete(state.requestId)
      return { requestId, conversationId }
    }

    // 8. 异步执行流式生成
    this.runStream(sender, state, model, messages).catch((error) => {
      log.error('Stream execution failed', error, { requestId })
    })

    return { requestId, conversationId }
  }

  /**
   * 中断流式生成
   */
  async abort(requestId: string): Promise<void> {
    const state = this.activeStreams.get(requestId)
    if (!state) {
      log.warn('Abort called on non-existent stream', { requestId })
      this.pendingAbortRequests.add(requestId)
      return
    }

    log.info('Aborting stream', { requestId, mode: state.mode ?? 'normal' })

    if (state.mode === 'agent') {
      this.abortedAgentRequests.add(requestId)
      try {
        this.langchainClientBridge.abort(requestId)
        if (state.utilityAgentId) {
          this.langchainClientBridge.destroyAgent(state.utilityAgentId)
        }
      } catch (err) {
        log.error('Failed to abort agent stream', err, { requestId })
      }

      this.updateAssistantMessage(
        state.assistantMessageId,
        state.answerText,
        '',
        'aborted',
        'User aborted'
      )
      this.sendEvent(state.sender, {
        type: 'finish',
        requestId: state.requestId,
        finishReason: 'aborted',
        messageId: state.assistantMessageId
      })
      try {
        ;(state as any).unsubscribe?.()
      } catch (err) {
        log.warn('Failed to unsubscribe utility stream', { requestId: state.requestId })
      }
      this.activeStreams.delete(state.requestId)
      setTimeout(() => {
        this.abortedAgentRequests.delete(requestId)
      }, 10000)
    }

    state.abortController.abort()
  }

  /**
   * 获取对话历史
   */
  async getHistory(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: MessageRow[]; total: number }> {
    const countRow = this.db
      .prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?')
      .get(conversationId) as { count: number }

    const messages = this.db
      .prepare(
        `SELECT * FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`
      )
      .all(conversationId, limit, offset) as MessageRow[]

    return {
      messages: messages.reverse(), // 反转为时间正序
      total: countRow.count
    }
  }

  /**
   * 获取预设列表
   */
  async listPresets(): Promise<Array<{ id: string; name: string; description?: string | null }>> {
    this.ensureDefaultPresets()
    const rows = this.db.prepare('SELECT * FROM presets ORDER BY created_at ASC').all() as AgentRow[]
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null
    }))
  }

  /**
   * 获取指定预设下的对话列表
   */
  async listConversations(presetId: string): Promise<
    Array<{
      id: string
      presetId: string
      title: string | null
      providerId: string
      modelId: string
      updatedAt: string
      messageCount: number
    }>
  > {
    this.ensureDefaultPresets()
    const rows = this.db
      .prepare(
        `SELECT c.id, c.preset_id, c.title, c.provider_id, c.model_id, c.updated_at,
                COUNT(m.id) as message_count
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.preset_id = ?
         GROUP BY c.id
         ORDER BY c.updated_at DESC`
      )
      .all(presetId) as ConversationSummaryRow[]
    return rows.map((row) => ({
      id: row.id,
      presetId: row.preset_id,
      title: row.title ?? null,
      providerId: row.provider_id,
      modelId: row.model_id,
      updatedAt: row.updated_at,
      messageCount: row.message_count
    }))
  }

  /**
   * 创建预设
   */
  async createPreset(
    name: string,
    description?: string | null
  ): Promise<{ id: string; name: string; description?: string | null }> {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Preset name is required')
    }

    const id = randomUUID()
    this.db
      .prepare(`INSERT INTO presets (id, name, description) VALUES (?, ?, ?)`)
      .run(id, trimmedName, description ?? null)

    return { id, name: trimmedName, description: description ?? null }
  }

  /**
   * 创建对话
   */
  async createConversation(payload: {
    presetId: string
    title?: string | null
    providerId: string
    modelId: string
    enableThinking?: boolean
  }): Promise<{
    id: string
    presetId: string
    title: string | null
    providerId: string
    modelId: string
    updatedAt: string
    messageCount: number
  }> {
    const { presetId, title, providerId, modelId, enableThinking } = payload
    await this.ensurePreset(presetId)

    const id = randomUUID()
    const resolvedTitle = title?.trim() || `对话 ${id.slice(0, 8)}`

    this.db
      .prepare(
        `INSERT INTO conversations (id, preset_id, title, provider_id, model_id, enable_thinking, memory_rounds)
         VALUES (?, ?, ?, ?, ?, ?, 10)`
      )
      .run(id, presetId, resolvedTitle, providerId, modelId, enableThinking ? 1 : 0)

    const row = this.db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(id) as ConversationRow

    return {
      id: row.id,
      presetId: row.preset_id,
      title: row.title ?? null,
      providerId: row.provider_id,
      modelId: row.model_id,
      updatedAt: row.updated_at,
      messageCount: 0
    }
  }

  /**
   * 删除对话（级联删除所有消息）
   */
  async deleteConversation(conversationId: string): Promise<void> {
    // 1. 检查对话是否存在
    const exists = this.db
      .prepare('SELECT id FROM conversations WHERE id = ?')
      .get(conversationId)

    if (!exists) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    // 2. 检查是否有正在进行的流式生成
    for (const [requestId, state] of this.activeStreams.entries()) {
      if (state.conversationId === conversationId) {
        log.warn('Aborting active stream before deleting conversation', {
          conversationId,
          requestId
        })
        await this.abort(requestId)
      }
    }

    // 3. 删除消息（级联）
    this.db
      .prepare(
        'DELETE FROM message_usage WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)'
      )
      .run(conversationId)

    this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId)

    // 4. 删除对话
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId)

    log.info('Conversation deleted', { conversationId })
  }

  /**
   * 删除预设（级联删除所有对话和消息）
   */
  async deletePreset(presetId: string): Promise<void> {
    // 1. 检查预设是否存在
    const exists = this.db.prepare('SELECT id FROM presets WHERE id = ?').get(presetId)

    if (!exists) {
      throw new Error(`Preset not found: ${presetId}`)
    }

    // 2. 获取该预设下的所有对话
    const conversations = this.db
      .prepare('SELECT id FROM conversations WHERE preset_id = ?')
      .all(presetId) as Array<{ id: string }>

    // 3. 逐个删除对话（会自动中断流式生成）
    for (const conv of conversations) {
      await this.deleteConversation(conv.id)
    }

    // 4. 删除预设
    this.db.prepare('DELETE FROM presets WHERE id = ?').run(presetId)

    log.info('Preset deleted', { presetId, conversationCount: conversations.length })
  }

  // ==================== 私有方法 ====================

  /**
   * 确保 conversation 存在
   */
  private async ensureConversation(
    conversationId: string,
    presetId: string,
    providerId: string,
    modelId: string
  ): Promise<void> {
    const exists = this.db.prepare('SELECT id FROM conversations WHERE id = ?').get(conversationId)

    if (!exists) {
      this.db
        .prepare(
          `INSERT INTO conversations (id, preset_id, title, provider_id, model_id, enable_thinking, memory_rounds)
           VALUES (?, ?, ?, ?, ?, 0, 10)`
        )
        .run(conversationId, presetId, `对话 ${conversationId.slice(0, 8)}`, providerId, modelId)
      log.debug('Created new conversation', { conversationId })
    }
  }

  /**
   * 确保默认预设列表存在
   */
  private ensureDefaultPresets(): void {
    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM presets').get() as {
      count: number
    }

    if (countRow.count > 0) return

    const defaults = [
      { id: 'preset-1', name: '通用对话', description: '日常对话与问答' },
      { id: 'preset-2', name: '编程助手', description: '代码编写与调试' },
      { id: 'preset-3', name: '写作助手', description: '文案创作与润色' },
      { id: 'preset-4', name: '科研助手', description: '学术研究与分析' }
    ]

    const stmt = this.db.prepare(`INSERT INTO presets (id, name, description) VALUES (?, ?, ?)`)
    for (const preset of defaults) {
      stmt.run(preset.id, preset.name, preset.description)
    }
  }

  /**
   * 确保指定预设存在
   */
  private async ensurePreset(presetId: string): Promise<void> {
    this.ensureDefaultPresets()
    const exists = this.db.prepare('SELECT id FROM presets WHERE id = ?').get(presetId)
    if (!exists) {
      this.db
        .prepare(`INSERT INTO presets (id, name, description) VALUES (?, ?, ?)`)
        .run(presetId, presetId, null)
    }
  }

  /**
   * 插入消息
   */
  private insertMessage(params: {
    id: string
    conversation_id: string
    role: string
    text?: string | null
    reasoning?: string | null
    status: string
    error?: string | null
  }): void {
    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, text, reasoning, status, error)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.id,
        params.conversation_id,
        params.role,
        params.text ?? null,
        params.reasoning ?? null,
        params.status,
        params.error ?? null
      )

    this.db
      .prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`)
      .run(params.conversation_id)
  }

  /**
   * 更新 assistant message（finish 时）
   */
  private updateAssistantMessage(
    messageId: string,
    text: string,
    reasoning: string,
    status: string,
    error?: string
  ): void {
    this.db
      .prepare(
        `UPDATE messages 
         SET text = ?, reasoning = ?, status = ?, error = ?
         WHERE id = ?`
      )
      .run(text, reasoning, status, error ?? null, messageId)
  }

  /**
   * 插入 usage 统计
   */
  private insertUsage(
    messageId: string,
    usage: {
      inputTokens: number
      outputTokens: number
      reasoningTokens?: number
      totalTokens: number
    },
    providerMetadata?: Record<string, unknown>
  ): void {
    this.db
      .prepare(
        `INSERT INTO message_usage (message_id, input_tokens, output_tokens, reasoning_tokens, total_tokens, provider_metadata_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        messageId,
        usage.inputTokens,
        usage.outputTokens,
        usage.reasoningTokens ?? null,
        usage.totalTokens,
        providerMetadata ? JSON.stringify(providerMetadata) : null
      )
  }

  /**
   * 构建 AI SDK model
   */
  private async buildModel(
    providerId: string,
    modelId: string,
    enableThinking: boolean
  ): Promise<LanguageModel> {
    const config = await this.modelConfigService.getConfig()
    const provider = config.providers.find((p) => p.id === providerId)

    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`)
    }

    // 规范化 baseURL（确保有 /v1）
    const baseURL = this.normalizeBaseURL(provider.baseUrl)

    // 创建 openai-compatible provider
    const providerInstance = createOpenAICompatible({
      name: providerId,
      baseURL,
      apiKey: provider.apiKey,
      headers: provider.defaultHeaders,
      includeUsage: true
    })

    let model = providerInstance.chatModel(modelId)

    // enableThinking: 包装 extractReasoningMiddleware
    if (enableThinking) {
      model = wrapLanguageModel({
        model,
        middleware: extractReasoningMiddleware({ tagName: 'think', startWithReasoning: true })
      })
    }

    return model
  }

  /**
   * 规范化 baseURL
   */
  private normalizeBaseURL(baseUrl: string): string {
    const url = baseUrl.trim().replace(/\/$/, '')
    return url.endsWith('/v1') ? url : `${url}/v1`
  }

  /**
   * 构建上下文（最近 10 轮 = 20 条）
   */
  private async buildContext(
    conversationId: string,
    enableThinking: boolean
  ): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    const rows = this.db
      .prepare(
        `SELECT role, text 
         FROM messages 
         WHERE conversation_id = ? AND role IN ('user', 'assistant') AND status = 'final'
         ORDER BY created_at DESC 
         LIMIT 20`
      )
      .all(conversationId) as Array<{ role: string; text: string | null }>

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = rows
      .reverse()
      .filter((r) => r.text)
      .map((r) => ({
        role: r.role as 'user' | 'assistant',
        content: r.text!
      }))

    // enableThinking: 加 system hint
    if (enableThinking) {
      messages.unshift({
        role: 'system',
        content: '请把思考过程放在 <think>...</think> 标签内，最终回答不要包含 <think> 标签。'
      })
    }

    return messages
  }

  /**
   * 执行流式生成
   */
  private async runStream(
    sender: WebContents,
    state: StreamState,
    model: LanguageModel,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): Promise<void> {
    try {
      const result = streamText({
        model,
        messages,
        abortSignal: state.abortController.signal
      })

      // 处理 fullStream
      for await (const part of result.fullStream) {
        switch (part.type) {
          case 'text-delta': {
            const delta = this.extractDelta(part)
            state.answerText += delta
            this.sendEvent(sender, {
              type: 'text-delta',
              requestId: state.requestId,
              delta
            })
            break
          }

          case 'reasoning-start': {
            this.sendEvent(sender, {
              type: 'reasoning-start',
              requestId: state.requestId,
              id: (part as any).id ?? 'reasoning-block'
            })
            break
          }

          case 'reasoning-delta': {
            const delta = this.extractDelta(part)
            state.reasoningText += delta
            this.sendEvent(sender, {
              type: 'reasoning-delta',
              requestId: state.requestId,
              id: (part as any).id ?? 'reasoning-block',
              delta
            })
            break
          }

          case 'reasoning-end': {
            this.sendEvent(sender, {
              type: 'reasoning-end',
              requestId: state.requestId,
              id: (part as any).id ?? 'reasoning-block'
            })
            break
          }

          case 'error': {
            const errorMsg = (part as any).error?.message ?? 'Unknown error'
            this.sendEvent(sender, {
              type: 'error',
              requestId: state.requestId,
              message: errorMsg
            })
            break
          }
        }
      }

      // 获取 usage
      const usage = await result.usage
      const finishReason = await result.finishReason

      // 更新 assistant message
      this.updateAssistantMessage(
        state.assistantMessageId,
        state.answerText,
        state.reasoningText,
        finishReason === 'stop' ? 'final' : 'error',
        undefined
      )

      // 写入 usage
      if (usage) {
        const usageData = usage as any
        this.insertUsage(
          state.assistantMessageId,
          {
            inputTokens: usageData.promptTokens ?? usageData.inputTokens ?? 0,
            outputTokens: usageData.completionTokens ?? usageData.outputTokens ?? 0,
            totalTokens: usageData.totalTokens ?? 0
          },
          undefined
        )
      }

      // 发送 finish
      const usageData = usage as any
      this.sendEvent(sender, {
        type: 'finish',
        requestId: state.requestId,
        finishReason: 'stop',
        messageId: state.assistantMessageId,
        usage: usage
          ? {
              inputTokens: usageData.promptTokens ?? usageData.inputTokens ?? 0,
              outputTokens: usageData.completionTokens ?? usageData.outputTokens ?? 0,
              totalTokens: usageData.totalTokens ?? 0
            }
          : undefined
      })

      log.info('Stream finished successfully', { requestId: state.requestId })
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户中断
        this.updateAssistantMessage(
          state.assistantMessageId,
          state.answerText,
          state.reasoningText,
          'aborted',
          'User aborted'
        )

        this.sendEvent(sender, {
          type: 'finish',
          requestId: state.requestId,
          finishReason: 'aborted',
          messageId: state.assistantMessageId
        })

        log.info('Stream aborted by user', { requestId: state.requestId })
      } else {
        // 错误
        this.updateAssistantMessage(
          state.assistantMessageId,
          state.answerText,
          state.reasoningText,
          'error',
          error.message
        )

        this.sendEvent(sender, {
          type: 'error',
          requestId: state.requestId,
          message: error.message ?? 'Unknown error',
          stack: error.stack
        })

        this.sendEvent(sender, {
          type: 'finish',
          requestId: state.requestId,
          finishReason: 'error',
          messageId: state.assistantMessageId
        })

        log.error('Stream failed', error, { requestId: state.requestId })
      }
    } finally {
      this.activeStreams.delete(state.requestId)
    }
  }

  /**
   * 兼容提取 delta（兼容 v5 不同版本字段差异）
   */
  private extractDelta(part: any): string {
    return part.delta ?? part.text ?? part.textDelta ?? ''
  }

  private toLangchainHistory(conversationId: string): LangchainClientChatMessage[] {
    const rows = this.db
      .prepare(
        `SELECT role, text 
         FROM messages 
         WHERE conversation_id = ? AND role IN ('user', 'assistant') AND status = 'final'
         ORDER BY created_at DESC 
         LIMIT 20`
      )
      .all(conversationId) as Array<{ role: string; text: string | null }>

    return rows
      .reverse()
      .filter((r) => r.text)
      .map((r) => ({ role: r.role as 'user' | 'assistant', content: r.text! }))
  }

  private toLangchainRetrievalConfig(
    retrieval?: AiChatRetrievalConfig
  ): LangchainClientRetrievalConfig | undefined {
    if (!retrieval) return undefined
    if (!Array.isArray(retrieval.scopes) || retrieval.scopes.length === 0) return undefined

    return {
      scopes: retrieval.scopes.map((s) => ({
        knowledgeBaseId: s.knowledgeBaseId,
        tableName: s.tableName,
        fileKeys: s.fileKeys
      })),
      k: retrieval.k,
      ef: retrieval.ef,
      rerankModelId: retrieval.rerankModelId,
      rerankTopN: retrieval.rerankTopN
    }
  }

  private async resolveProviderOverride(payload: {
    providerId: string
    providerOverride?: { baseUrl: string; apiKey: string; defaultHeaders?: Record<string, string> }
  }): Promise<{ baseUrl: string; apiKey: string; defaultHeaders?: Record<string, string> }> {
    if (payload.providerOverride?.baseUrl && payload.providerOverride?.apiKey) {
      return payload.providerOverride
    }

    // fallback to persisted config
    const config = await this.modelConfigService.getConfig()
    const provider = config.providers.find((p) => p.id === payload.providerId)
    if (!provider) {
      throw new Error(`Provider not found: ${payload.providerId}`)
    }
    if (!provider.baseUrl || !provider.apiKey) {
      throw new Error(`Provider missing baseUrl/apiKey: ${payload.providerId}`)
    }

    log.warn('providerOverride not provided; falling back to persisted provider config', {
      providerId: payload.providerId
    })

    return {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      defaultHeaders: provider.defaultHeaders
    }
  }

  private async startAgentStream(
    sender: WebContents,
    payload: {
      requestId: string
      conversationId: string
      presetId: string
      providerId: string
      modelId: string
      input: string
      enableThinking: boolean
      retrieval?: AiChatRetrievalConfig
      providerOverride?: {
        baseUrl: string
        apiKey: string
        defaultHeaders?: Record<string, string>
      }
      agentModelConfig?: {
        knowledgeQa?: KnowledgeQaModelConfig
      }
    }
  ): Promise<{ requestId: string; conversationId: string }> {
    const {
      requestId,
      conversationId,
      presetId,
      providerId,
      modelId,
      input,
      retrieval,
      providerOverride,
      agentModelConfig
    } = payload

    // 1. 确保 conversation 存在（如不存在则创建）
    await this.ensurePreset(presetId)
    await this.ensureConversation(conversationId, presetId, providerId, modelId)

    // 2. 创建 user message
    const userMessageId = randomUUID()
    this.insertMessage({
      id: userMessageId,
      conversation_id: conversationId,
      role: 'user',
      text: input,
      status: 'final'
    })

    // 3. 创建 assistant message（status='streaming'）
    const assistantMessageId = randomUUID()
    this.insertMessage({
      id: assistantMessageId,
      conversation_id: conversationId,
      role: 'assistant',
      status: 'streaming',
      text: null,
      reasoning: null
    })

    // 4. 创建 AbortController
    const abortController = new AbortController()

    // Use conversationId as utility agentId to isolate memory per conversation.
    const utilityAgentId = `conv-${conversationId}`

    const state: StreamState = {
      sender,
      requestId,
      conversationId,
      providerId,
      modelId,
      userMessageId,
      assistantMessageId,
      mode: 'agent',
      utilityAgentId,
      abortController,
      answerText: '',
      reasoningText: '',
      startedAt: new Date()
    }

    this.activeStreams.set(requestId, state)

    // 5. 发送 stream-start
    this.sendEvent(sender, {
      type: 'stream-start',
      requestId,
      conversationId,
      providerId,
      modelId,
      startedAt: state.startedAt.toISOString()
    })
    if (this.pendingAbortRequests.has(requestId)) {
      this.pendingAbortRequests.delete(requestId)
      this.updateAssistantMessage(
        state.assistantMessageId,
        state.answerText,
        state.reasoningText,
        'aborted',
        'User aborted'
      )
      this.sendEvent(sender, {
        type: 'finish',
        requestId: state.requestId,
        finishReason: 'aborted',
        messageId: state.assistantMessageId
      })
      this.activeStreams.delete(state.requestId)
      return { requestId, conversationId }
    }

    // 6. 准备 langchain-client
    const provider = await this.resolveProviderOverride({ providerId, providerOverride })

    const lcRetrieval = this.toLangchainRetrievalConfig(retrieval)

    const knowledgeQaConfig = agentModelConfig?.knowledgeQa
    if (
      knowledgeQaConfig &&
      (!knowledgeQaConfig.planModel.providerId ||
        !knowledgeQaConfig.planModel.modelId ||
        !knowledgeQaConfig.summaryModel.providerId ||
        !knowledgeQaConfig.summaryModel.modelId)
    ) {
      throw new Error('Knowledge-QA 配置不完整：请设置规划模型与总结模型')
    }

    const resolveProviderConfig = async (id: string) => {
      const config = await this.modelConfigService.getConfig()
      const provider = config.providers.find((p) => p.id === id)
      if (!provider) throw new Error(`Provider not found: ${id}`)
      if (!provider.baseUrl || !provider.apiKey) {
        throw new Error(`Provider missing baseUrl/apiKey: ${id}`)
      }
      return {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        defaultHeaders: provider.defaultHeaders
      }
    }

    let knowledgeQaResolved: KnowledgeQaModelConfig | undefined
    if (knowledgeQaConfig) {
      const planProviderId = knowledgeQaConfig.planModel.providerId!
      const summaryProviderId = knowledgeQaConfig.summaryModel.providerId!
      const planProvider = await resolveProviderConfig(planProviderId)
      const summaryProvider = await resolveProviderConfig(summaryProviderId)

      knowledgeQaResolved = {
        ...knowledgeQaConfig,
        planModel: {
          ...knowledgeQaConfig.planModel,
          provider: planProvider
        },
        summaryModel: {
          ...knowledgeQaConfig.summaryModel,
          provider: summaryProvider
        },
        retrieval: {
          ...knowledgeQaConfig.retrieval,
          rerankTopN: knowledgeQaConfig.retrieval.topK
        }
      }
    }

    // enable tool even if no selection; tool will guide user
    const agentCreateConfig: LangchainClientAgentCreateConfig = {
      provider: {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        defaultHeaders: provider.defaultHeaders
      },
      modelId,
      systemPrompt: undefined,
      retrieval: { scopes: [] },
      modelConfig: knowledgeQaResolved
        ? {
            knowledgeQa: knowledgeQaResolved
          }
        : undefined
    }

    try {
      await this.langchainClientBridge.spawn()
      this.langchainClientBridge.init({ knowledgeApiUrl: 'http://127.0.0.1:3721' })

      await this.langchainClientBridge.ensureAgent(utilityAgentId, agentCreateConfig)
    } catch (err) {
      log.error('Failed to prepare langchain-client', err, { requestId, utilityAgentId })
      this.sendEvent(sender, {
        type: 'error',
        requestId,
        message: err instanceof Error ? err.message : String(err)
      })
      this.sendEvent(sender, {
        type: 'finish',
        requestId,
        finishReason: 'error',
        messageId: assistantMessageId
      })
      this.updateAssistantMessage(
        assistantMessageId,
        state.answerText,
        state.reasoningText,
        'error',
        err instanceof Error ? err.message : String(err)
      )
      this.activeStreams.delete(requestId)
      return { requestId, conversationId }
    }

    // 7. Subscribe and invoke
    const unsubscribe = this.langchainClientBridge.onMessage(
      (msg: LangchainClientToMainMessage) => {
        this.handleUtilityStreamMessage(sender, state, msg)
      }
    )

    const history = this.toLangchainHistory(conversationId)

    try {
      this.langchainClientBridge.invoke({
        agentId: utilityAgentId,
        requestId,
        input,
        history,
        retrieval: lcRetrieval
      })

      log.info('Agent invoke dispatched', {
        requestId,
        utilityAgentId,
        scopes: lcRetrieval?.scopes?.length ?? 0,
        fileKeysCount:
          lcRetrieval?.scopes?.reduce((acc, s) => acc + (s.fileKeys?.length ?? 0), 0) ?? 0
      })
    } catch (err) {
      unsubscribe()
      log.error('Failed to invoke agent', err, { requestId, utilityAgentId })
      this.sendEvent(sender, {
        type: 'error',
        requestId,
        message: err instanceof Error ? err.message : String(err)
      })
      this.sendEvent(sender, {
        type: 'finish',
        requestId,
        finishReason: 'error',
        messageId: assistantMessageId
      })
      this.updateAssistantMessage(
        assistantMessageId,
        state.answerText,
        state.reasoningText,
        'error',
        err instanceof Error ? err.message : String(err)
      )
      this.activeStreams.delete(requestId)
      return { requestId, conversationId }
    }

    // Ensure cleanup after finish/error
    ;(state as any).unsubscribe = unsubscribe

    return { requestId, conversationId }
  }

  private handleUtilityStreamMessage(
    sender: WebContents,
    state: StreamState,
    msg: LangchainClientToMainMessage
  ): void {
    // Only handle current request
    if ('requestId' in (msg as any) && (msg as any).requestId !== state.requestId) return
    if (this.abortedAgentRequests.has(state.requestId)) {
      return
    }

    switch (msg.type) {
      case 'invoke:text-delta': {
        state.answerText += msg.delta
        this.sendEvent(sender, { type: 'text-delta', requestId: state.requestId, delta: msg.delta })
        break
      }

      case 'invoke:tool-start': {
        this.sendEvent(sender, {
          type: 'tool-call',
          requestId: state.requestId,
          payload: msg.payload
        })
        break
      }

      case 'invoke:node-start': {
        this.sendEvent(sender, {
          type: 'node-start',
          requestId: state.requestId,
          payload: msg.payload
        })
        break
      }

      case 'invoke:node-result': {
        this.sendEvent(sender, {
          type: 'node-result',
          requestId: state.requestId,
          payload: msg.payload
        })
        break
      }

      case 'invoke:node-error': {
        this.sendEvent(sender, {
          type: 'node-error',
          requestId: state.requestId,
          payload: msg.payload
        })
        break
      }

      case 'invoke:tool-result': {
        this.sendEvent(sender, {
          type: 'tool-result',
          requestId: state.requestId,
          payload: msg.payload
        })
        break
      }

      case 'invoke:error': {
        this.sendEvent(sender, {
          type: 'error',
          requestId: state.requestId,
          message: msg.message,
          stack: msg.stack
        })
        break
      }

      case 'invoke:finish': {
        const finishReason = msg.finishReason
        const status =
          finishReason === 'stop' ? 'final' : finishReason === 'aborted' ? 'aborted' : 'error'

        // persist final assistant message
        this.updateAssistantMessage(
          state.assistantMessageId,
          state.answerText,
          '',
          status,
          finishReason === 'error' ? 'Agent stream error' : undefined
        )

        this.sendEvent(sender, {
          type: 'finish',
          requestId: state.requestId,
          finishReason,
          messageId: state.assistantMessageId
        })

        // cleanup
        try {
          ;(state as any).unsubscribe?.()
        } catch (err) {
          log.warn('Failed to unsubscribe utility stream', { requestId: state.requestId })
        }
        this.activeStreams.delete(state.requestId)
        this.abortedAgentRequests.delete(state.requestId)
        break
      }

      default:
        break
    }
  }

  /**
   * 发送流式事件
   */
  private sendEvent(sender: WebContents, event: AiChatStreamEvent): void {
    sender.send('aiChat:stream', event)
  }
}
