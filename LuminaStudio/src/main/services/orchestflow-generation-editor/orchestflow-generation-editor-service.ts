import type Database from 'better-sqlite3'
import type { WebContents } from 'electron'
import { randomUUID } from 'crypto'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelConfigService, PersistedModelProviderConfig } from '../model-config'
import type { OrchestflowGenerationEditorBridgeService } from '../orchestflow-generation-editor-bridge'
import type {
  GenerationChannelKey,
  GenerationCreateSessionRequest,
  GenerationDocument,
  GenerationListMessagesRequest,
  GenerationMessage,
  GenerationSaveDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSdkVendor,
  GenerationSessionDetail,
  GenerationSessionSummary,
  GenerationStageConfig,
  GenerationStageKey,
  GenerationUpdateSessionStateRequest,
  ModelProviderProtocol
} from '@preload/types'
import type {
  ActiveGenerationStream,
  GenerationDocumentRow,
  GenerationMessageRow,
  GenerationSessionRow,
  GenerationStageConfigRow
} from './types'
import type { GenerationUtilityToMainMessage } from '@utility/orchestflow-generation-editor/messages.types'

const DEFAULT_STAGE_CONFIGS: Record<
  GenerationStageKey,
  Omit<GenerationStageConfig, 'providerId' | 'modelId' | 'sdkVendor'>
> = {
  analysis: { stageKey: 'analysis', memoryRounds: 6, copilotMemoryRounds: 5, autoApproved: true },
  design: { stageKey: 'design', memoryRounds: 6, copilotMemoryRounds: 5, autoApproved: true },
  verify: { stageKey: 'verify', memoryRounds: 5, copilotMemoryRounds: 4, autoApproved: true }
}

const DEFAULT_DOCUMENTS: Record<
  GenerationStageKey,
  Omit<GenerationDocument, 'summary' | 'content'>
> = {
  analysis: { documentKey: 'analysis', title: '需求分析', fileName: 'requirement_analysis.md' },
  design: { documentKey: 'design', title: '规划设计', fileName: 'planning_design.md' },
  verify: { documentKey: 'verify', title: '校验', fileName: 'verify_checklist.md' }
}

export class OrchestflowGenerationEditorService {
  private db: Database.Database
  private activeStreams = new Map<string, ActiveGenerationStream>()

  constructor(
    databaseManager: DatabaseManager,
    private readonly modelConfigService: ModelConfigService,
    private readonly bridge: OrchestflowGenerationEditorBridgeService
  ) {
    this.db = databaseManager.getDatabase('orchestflow-generation-editor')
    this.bridge.onMessage((message) => {
      this.handleUtilityMessage(message)
    })
  }

  async listSessions(): Promise<GenerationSessionSummary[]> {
    const rows = this.db
      .prepare('SELECT * FROM generation_sessions ORDER BY updated_at DESC')
      .all() as GenerationSessionRow[]
    return rows.map((row) => this.mapSessionSummary(row))
  }

  async createSession(request: GenerationCreateSessionRequest): Promise<GenerationSessionDetail> {
    const title = request.title.trim()
    if (!title) throw new Error('Session title is required')

    const sessionId = randomUUID()
    const transaction = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO generation_sessions (id, title, current_stage, summary, analysis_turn_count, plan_generated)
           VALUES (?, ?, 'analysis', ?, 0, 0)`
        )
        .run(sessionId, title, '新会话已创建，等待第一轮需求输入。')

      const insertConfig = this.db.prepare(
        `INSERT INTO generation_stage_configs (
          session_id, stage_key, provider_id, model_id, sdk_vendor, memory_rounds, copilot_memory_rounds, auto_approved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      ;(['analysis', 'design', 'verify'] as GenerationStageKey[]).forEach((stageKey) => {
        const config = DEFAULT_STAGE_CONFIGS[stageKey]
        insertConfig.run(
          sessionId,
          stageKey,
          null,
          null,
          null,
          config.memoryRounds,
          config.copilotMemoryRounds,
          config.autoApproved ? 1 : 0
        )
      })

      const insertDocument = this.db.prepare(
        `INSERT INTO generation_documents (session_id, document_key, title, file_name, summary, content)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      insertDocument.run(
        sessionId,
        'analysis',
        DEFAULT_DOCUMENTS.analysis.title,
        DEFAULT_DOCUMENTS.analysis.fileName,
        `围绕「${title}」建立需求分析结论。`,
        this.buildDefaultAnalysisContent(title)
      )
      insertDocument.run(
        sessionId,
        'design',
        DEFAULT_DOCUMENTS.design.title,
        DEFAULT_DOCUMENTS.design.fileName,
        `为「${title}」整理模块结构、数据流与交付路径。`,
        this.buildDefaultDesignContent(title)
      )
      insertDocument.run(
        sessionId,
        'verify',
        DEFAULT_DOCUMENTS.verify.title,
        DEFAULT_DOCUMENTS.verify.fileName,
        `为「${title}」整理校验清单。`,
        this.buildDefaultVerifyContent(title)
      )
    })

    transaction()
    return this.getSessionDetail(sessionId)
  }

  async getSessionDetail(sessionId: string): Promise<GenerationSessionDetail> {
    const sessionRow = this.db
      .prepare('SELECT * FROM generation_sessions WHERE id = ?')
      .get(sessionId) as GenerationSessionRow | undefined
    if (!sessionRow) throw new Error(`Session not found: ${sessionId}`)

    const stageConfigRows = this.db
      .prepare('SELECT * FROM generation_stage_configs WHERE session_id = ? ORDER BY stage_key ASC')
      .all(sessionId) as GenerationStageConfigRow[]
    const documentRows = this.db
      .prepare('SELECT * FROM generation_documents WHERE session_id = ? ORDER BY document_key ASC')
      .all(sessionId) as GenerationDocumentRow[]
    const messageRows = this.db
      .prepare('SELECT * FROM generation_messages WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as GenerationMessageRow[]

    return {
      ...this.mapSessionSummary(sessionRow),
      stageConfigs: stageConfigRows.map((row) => this.mapStageConfig(row)),
      documents: documentRows.map((row) => this.mapDocument(row)),
      messages: messageRows.map((row) => this.mapMessage(row))
    }
  }

  async updateSessionState(
    request: GenerationUpdateSessionStateRequest
  ): Promise<GenerationSessionSummary> {
    const current = this.db
      .prepare('SELECT * FROM generation_sessions WHERE id = ?')
      .get(request.sessionId) as GenerationSessionRow | undefined
    if (!current) throw new Error(`Session not found: ${request.sessionId}`)

    this.db
      .prepare(
        `UPDATE generation_sessions
         SET current_stage = ?, summary = ?, analysis_turn_count = ?, plan_generated = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        request.currentStage ?? current.current_stage,
        request.summary ?? current.summary,
        request.analysisTurnCount ?? current.analysis_turn_count,
        request.planGenerated === undefined
          ? current.plan_generated
          : request.planGenerated
            ? 1
            : 0,
        request.sessionId
      )

    const updated = this.db
      .prepare('SELECT * FROM generation_sessions WHERE id = ?')
      .get(request.sessionId) as GenerationSessionRow
    return this.mapSessionSummary(updated)
  }

  async saveStageConfig(request: GenerationSaveStageConfigRequest): Promise<GenerationStageConfig> {
    this.db
      .prepare(
        `INSERT INTO generation_stage_configs (
          session_id, stage_key, provider_id, model_id, sdk_vendor, memory_rounds, copilot_memory_rounds, auto_approved, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(session_id, stage_key) DO UPDATE SET
          provider_id = excluded.provider_id,
          model_id = excluded.model_id,
          sdk_vendor = excluded.sdk_vendor,
          memory_rounds = excluded.memory_rounds,
          copilot_memory_rounds = excluded.copilot_memory_rounds,
          auto_approved = excluded.auto_approved,
          updated_at = datetime('now')`
      )
      .run(
        request.sessionId,
        request.config.stageKey,
        request.config.providerId,
        request.config.modelId,
        request.config.sdkVendor,
        request.config.memoryRounds,
        request.config.copilotMemoryRounds,
        request.config.autoApproved ? 1 : 0
      )

    this.touchSession(request.sessionId)
    const row = this.db
      .prepare('SELECT * FROM generation_stage_configs WHERE session_id = ? AND stage_key = ?')
      .get(request.sessionId, request.config.stageKey) as GenerationStageConfigRow
    return this.mapStageConfig(row)
  }

  async saveDocument(request: GenerationSaveDocumentRequest): Promise<GenerationDocument> {
    this.db
      .prepare(
        `INSERT INTO generation_documents (session_id, document_key, title, file_name, summary, content, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(session_id, document_key) DO UPDATE SET
           title = excluded.title,
           file_name = excluded.file_name,
           summary = excluded.summary,
           content = excluded.content,
           updated_at = datetime('now')`
      )
      .run(
        request.sessionId,
        request.document.documentKey,
        request.document.title,
        request.document.fileName,
        request.document.summary,
        request.document.content
      )

    this.touchSession(request.sessionId)
    const row = this.db
      .prepare('SELECT * FROM generation_documents WHERE session_id = ? AND document_key = ?')
      .get(request.sessionId, request.document.documentKey) as GenerationDocumentRow
    return this.mapDocument(row)
  }

  async listMessages(request: GenerationListMessagesRequest): Promise<GenerationMessage[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM generation_messages
         WHERE session_id = ? AND channel_key = ?
         ORDER BY created_at ASC`
      )
      .all(request.sessionId, request.channelKey) as GenerationMessageRow[]
    return rows.map((row) => this.mapMessage(row))
  }

  async sendMessage(
    sender: WebContents,
    request: {
      sessionId: string
      channelKey: GenerationChannelKey
      providerId: string
      modelId: string
      content: string
    }
  ): Promise<{ requestId: string }> {
    const text = request.content.trim()
    if (!text) throw new Error('Message content is required')

    const provider = await this.resolveProvider(request.providerId)
    const vendor = this.resolveSdkVendorFromProtocol(provider.protocol)
    const requestId = randomUUID()
    const assistantMessageId = randomUUID()

    const transaction = this.db.transaction(() => {
      this.insertMessage({
        id: randomUUID(),
        session_id: request.sessionId,
        channel_key: request.channelKey,
        request_id: requestId,
        role: 'user',
        content: text,
        status: 'final',
        provider_id: request.providerId,
        model_id: request.modelId,
        error: null,
        usage_json: null,
        meta_json: null
      })

      this.insertMessage({
        id: assistantMessageId,
        session_id: request.sessionId,
        channel_key: request.channelKey,
        request_id: requestId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        provider_id: request.providerId,
        model_id: request.modelId,
        error: null,
        usage_json: null,
        meta_json: JSON.stringify({ vendor, protocol: provider.protocol })
      })
    })
    transaction()

    this.activeStreams.set(requestId, {
      requestId,
      sessionId: request.sessionId,
      channelKey: request.channelKey,
      messageId: assistantMessageId,
      sender,
      answerText: '',
      providerId: request.providerId,
      modelId: request.modelId
    })

    await this.bridge.spawn()
    this.bridge.init()
    this.bridge.invokeChat({
      requestId,
      sessionId: request.sessionId,
      channelKey: request.channelKey,
      vendor,
      modelId: request.modelId,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl || undefined,
      messages: [{ role: 'user', content: text }]
    })

    return { requestId }
  }

  async abortMessage(requestId: string): Promise<void> {
    this.bridge.abortChat(requestId)
  }

  private handleUtilityMessage(message: GenerationUtilityToMainMessage): void {
    if (message.type === 'chat:start') {
      const state = this.activeStreams.get(message.requestId)
      if (!state) return
      state.sender.send('orchestflowGenerationEditor:stream', {
        type: 'stream-start',
        requestId: state.requestId,
        sessionId: state.sessionId,
        channelKey: state.channelKey,
        messageId: state.messageId
      })
      return
    }

    if (message.type === 'chat:text-delta') {
      const state = this.activeStreams.get(message.requestId)
      if (!state) return
      state.answerText += message.delta
      this.db
        .prepare(
          `UPDATE generation_messages
           SET content = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .run(state.answerText, state.messageId)
      state.sender.send('orchestflowGenerationEditor:stream', {
        type: 'text-delta',
        requestId: state.requestId,
        sessionId: state.sessionId,
        channelKey: state.channelKey,
        messageId: state.messageId,
        delta: message.delta
      })
      return
    }

    if (message.type === 'chat:error') {
      const state = this.activeStreams.get(message.requestId)
      if (!state) return
      this.db
        .prepare(
          `UPDATE generation_messages
           SET status = 'error', error = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .run(message.message, state.messageId)
      state.sender.send('orchestflowGenerationEditor:stream', {
        type: 'error',
        requestId: state.requestId,
        sessionId: state.sessionId,
        channelKey: state.channelKey,
        messageId: state.messageId,
        message: message.message
      })
      return
    }

    if (message.type === 'chat:finish') {
      const state = this.activeStreams.get(message.requestId)
      if (!state) return
      const status =
        message.finishReason === 'stop'
          ? 'final'
          : message.finishReason === 'aborted'
            ? 'aborted'
            : 'error'
      this.db
        .prepare(
          `UPDATE generation_messages
           SET content = ?, status = ?, usage_json = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .run(
          state.answerText,
          status,
          message.usage ? JSON.stringify(message.usage) : null,
          state.messageId
        )
      state.sender.send('orchestflowGenerationEditor:stream', {
        type: 'finish',
        requestId: state.requestId,
        sessionId: state.sessionId,
        channelKey: state.channelKey,
        messageId: state.messageId,
        finishReason: message.finishReason,
        usageJson: message.usage ? JSON.stringify(message.usage) : null
      })
      this.touchSession(state.sessionId)
      this.activeStreams.delete(message.requestId)
    }
  }

  private insertMessage(row: Omit<GenerationMessageRow, 'created_at' | 'updated_at'>): void {
    this.db
      .prepare(
        `INSERT INTO generation_messages (
          id, session_id, channel_key, request_id, role, content, status, provider_id, model_id, error, usage_json, meta_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.session_id,
        row.channel_key,
        row.request_id,
        row.role,
        row.content,
        row.status,
        row.provider_id,
        row.model_id,
        row.error,
        row.usage_json,
        row.meta_json
      )
    this.touchSession(row.session_id)
  }

  private touchSession(sessionId: string): void {
    this.db
      .prepare(`UPDATE generation_sessions SET updated_at = datetime('now') WHERE id = ?`)
      .run(sessionId)
  }

  private async resolveProvider(providerId: string): Promise<PersistedModelProviderConfig> {
    const config = await this.modelConfigService.getConfig()
    const provider = config.providers.find((item) => item.id === providerId)
    if (!provider) throw new Error(`Provider not found: ${providerId}`)
    if (!provider.apiKey) throw new Error(`Provider apiKey missing: ${providerId}`)
    return provider
  }

  private resolveSdkVendorFromProtocol(protocol: ModelProviderProtocol): GenerationSdkVendor {
    if (protocol === 'claude') return 'anthropic'
    if (protocol === 'gemini') return 'google'
    return 'openai'
  }

  private mapSessionSummary(row: GenerationSessionRow): GenerationSessionSummary {
    return {
      id: row.id,
      title: row.title,
      currentStage: row.current_stage,
      summary: row.summary,
      analysisTurnCount: row.analysis_turn_count,
      planGenerated: row.plan_generated === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private mapStageConfig(row: GenerationStageConfigRow): GenerationStageConfig {
    return {
      stageKey: row.stage_key,
      providerId: row.provider_id,
      modelId: row.model_id,
      sdkVendor: row.sdk_vendor,
      memoryRounds: row.memory_rounds,
      copilotMemoryRounds: row.copilot_memory_rounds,
      autoApproved: row.auto_approved === 1
    }
  }

  private mapDocument(row: GenerationDocumentRow): GenerationDocument {
    return {
      documentKey: row.document_key,
      title: row.title,
      fileName: row.file_name,
      summary: row.summary,
      content: row.content
    }
  }

  private mapMessage(row: GenerationMessageRow): GenerationMessage {
    return {
      id: row.id,
      sessionId: row.session_id,
      channelKey: row.channel_key,
      requestId: row.request_id,
      role: row.role,
      content: row.content,
      status: row.status,
      providerId: row.provider_id,
      modelId: row.model_id,
      error: row.error,
      usageJson: row.usage_json,
      metaJson: row.meta_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private buildDefaultAnalysisContent(title: string): string {
    return [
      `# ${title} 需求分析`,
      '',
      '## 需求摘要',
      `- 目标：围绕 ${title} 先完成需求澄清与范围收敛`,
      '',
      '## 待补充',
      '- 核心角色',
      '- 关键操作链路',
      '- 风险与边界'
    ].join('\n')
  }

  private buildDefaultDesignContent(title: string): string {
    return [
      '# 规划设计文档',
      '',
      '## 项目对象',
      title,
      '',
      '## 模块结构',
      '- 待补充模块划分',
      '',
      '## 数据流',
      '- 待补充数据输入/输出'
    ].join('\n')
  }

  private buildDefaultVerifyContent(title: string): string {
    return [
      `# ${title} 校验清单`,
      '',
      '1. 核对需求分析与设计结论是否一致',
      '2. 核对设计中的模块边界与数据流',
      '3. 确认最终交付前的回归检查项'
    ].join('\n')
  }
}
