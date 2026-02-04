import type Database from 'better-sqlite3'
import type { WebContents } from 'electron'
import { randomUUID } from 'crypto'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, wrapLanguageModel, extractReasoningMiddleware } from 'ai'
import type { LanguageModel } from 'ai'
import { logger } from '../logger'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelConfigService } from '../model-config'
import type { AiChatStreamEvent } from '@preload/types'
import type { StreamState, MessageRow, AgentRow, ConversationSummaryRow, ConversationRow } from './types'

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

  constructor(
    databaseManager: DatabaseManager,
    private readonly modelConfigService: ModelConfigService
  ) {
    this.db = databaseManager.getDatabase('userdata')
  }

  /**
   * 启动流式生成
   */
  async startStream(
    sender: WebContents,
    payload: {
      conversationId: string
      agentId: string
      providerId: string
      modelId: string
      input: string
      enableThinking?: boolean
    }
  ): Promise<{ requestId: string; conversationId: string }> {
    const requestId = randomUUID()
    const { conversationId, agentId, providerId, modelId, input, enableThinking } = payload

    log.info('Starting stream', { requestId, conversationId, agentId, providerId, modelId })

    // 1. 确保 conversation 存在（如不存在则创建）
    await this.ensureAgent(agentId)
    await this.ensureConversation(conversationId, agentId, providerId, modelId)

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
      requestId,
      conversationId,
      providerId,
      modelId,
      userMessageId,
      assistantMessageId,
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
      return
    }

    log.info('Aborting stream', { requestId })
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
   * 获取 Agent 列表
   */
  async listAgents(): Promise<Array<{ id: string; name: string; description?: string | null }>> {
    this.ensureDefaultAgents()
    const rows = this.db
      .prepare('SELECT * FROM agents ORDER BY created_at ASC')
      .all() as AgentRow[]
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null
    }))
  }

  /**
   * 获取指定 Agent 下的对话列表
   */
  async listConversations(
    agentId: string
  ): Promise<
    Array<{
      id: string
      agentId: string
      title: string | null
      providerId: string
      modelId: string
      updatedAt: string
      messageCount: number
    }>
  > {
    this.ensureDefaultAgents()
    const rows = this.db
      .prepare(
        `SELECT c.id, c.agent_id, c.title, c.provider_id, c.model_id, c.updated_at,
                COUNT(m.id) as message_count
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.agent_id = ?
         GROUP BY c.id
         ORDER BY c.updated_at DESC`
      )
      .all(agentId) as ConversationSummaryRow[]
    return rows.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      title: row.title ?? null,
      providerId: row.provider_id,
      modelId: row.model_id,
      updatedAt: row.updated_at,
      messageCount: row.message_count
    }))
  }

  /**
   * 创建 Agent
   */
  async createAgent(
    name: string,
    description?: string | null
  ): Promise<{ id: string; name: string; description?: string | null }> {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Agent name is required')
    }

    const id = randomUUID()
    this.db
      .prepare(`INSERT INTO agents (id, name, description) VALUES (?, ?, ?)`)
      .run(id, trimmedName, description ?? null)

    return { id, name: trimmedName, description: description ?? null }
  }

  /**
   * 创建对话
   */
  async createConversation(payload: {
    agentId: string
    title?: string | null
    providerId: string
    modelId: string
    enableThinking?: boolean
  }): Promise<{
    id: string
    agentId: string
    title: string | null
    providerId: string
    modelId: string
    updatedAt: string
    messageCount: number
  }> {
    const { agentId, title, providerId, modelId, enableThinking } = payload
    await this.ensureAgent(agentId)

    const id = randomUUID()
    const resolvedTitle = title?.trim() || `对话 ${id.slice(0, 8)}`

    this.db
      .prepare(
        `INSERT INTO conversations (id, agent_id, title, provider_id, model_id, enable_thinking, memory_rounds)
         VALUES (?, ?, ?, ?, ?, ?, 10)`
      )
      .run(id, agentId, resolvedTitle, providerId, modelId, enableThinking ? 1 : 0)

    const row = this.db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(id) as ConversationRow

    return {
      id: row.id,
      agentId: row.agent_id,
      title: row.title ?? null,
      providerId: row.provider_id,
      modelId: row.model_id,
      updatedAt: row.updated_at,
      messageCount: 0
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 确保 conversation 存在
   */
  private async ensureConversation(
    conversationId: string,
    agentId: string,
    providerId: string,
    modelId: string
  ): Promise<void> {
    const exists = this.db
      .prepare('SELECT id FROM conversations WHERE id = ?')
      .get(conversationId)

    if (!exists) {
      this.db
        .prepare(
          `INSERT INTO conversations (id, agent_id, title, provider_id, model_id, enable_thinking, memory_rounds)
           VALUES (?, ?, ?, ?, ?, 0, 10)`
        )
        .run(
          conversationId,
          agentId,
          `对话 ${conversationId.slice(0, 8)}`,
          providerId,
          modelId
        )
      log.debug('Created new conversation', { conversationId })
    }
  }

  /**
   * 确保默认 Agent 列表存在
   */
  private ensureDefaultAgents(): void {
    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM agents').get() as {
      count: number
    }

    if (countRow.count > 0) return

    const defaults = [
      { id: 'agent-1', name: 'LuminaStudio AI', description: '通用助手' },
      { id: 'agent-2', name: 'Code Expert', description: '编程专家' },
      { id: 'agent-3', name: 'Writer Pro', description: '文案大师' },
      { id: 'agent-4', name: 'Research Assistant', description: '科研助手' }
    ]

    const stmt = this.db.prepare(`INSERT INTO agents (id, name, description) VALUES (?, ?, ?)`)
    for (const agent of defaults) {
      stmt.run(agent.id, agent.name, agent.description)
    }
  }

  /**
   * 确保指定 Agent 存在
   */
  private async ensureAgent(agentId: string): Promise<void> {
    this.ensureDefaultAgents()
    const exists = this.db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId)
    if (!exists) {
      this.db
        .prepare(`INSERT INTO agents (id, name, description) VALUES (?, ?, ?)`)
        .run(agentId, agentId, null)
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
        content:
          '请把思考过程放在 <think>...</think> 标签内，最终回答不要包含 <think> 标签。'
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

  /**
   * 发送流式事件
   */
  private sendEvent(sender: WebContents, event: AiChatStreamEvent): void {
    sender.send('aiChat:stream', event)
  }
}
