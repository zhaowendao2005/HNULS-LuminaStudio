import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type {
  GenerationCreateSessionRequest,
  GenerationDocument,
  GenerationListMessagesRequest,
  GenerationSaveDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSessionDetail,
  GenerationStageConfig,
  GenerationStageKey,
  GenerationUpdateSessionStateRequest
} from '@preload/types'
import { DEFAULT_DOCUMENTS, DEFAULT_STAGE_CONFIGS } from '../constants/defaults'
import {
  mapDocument,
  mapMessage,
  mapSessionSummary,
  mapStageConfig
} from '../mappers/generation-editor.mappers'
import type {
  GenerationDocumentRow,
  GenerationMessageRow,
  GenerationSessionRow,
  GenerationStageConfigRow
} from '../types/database.types'

/**
 * repository 层专门负责 Generate Editor 的 SQLite 访问。
 *
 * 这样 service 层就不需要再直接维护 SQL 细节，后面如果表结构继续长大，
 * 也可以在这里继续细拆成 session / message / document 等更小的 repo。
 */
export class GenerationEditorRepository {
  constructor(private readonly db: Database.Database) {}

  listSessions() {
    const rows = this.db
      .prepare('SELECT * FROM generation_sessions ORDER BY updated_at DESC')
      .all() as GenerationSessionRow[]
    return rows.map(mapSessionSummary)
  }

  createSession(request: GenerationCreateSessionRequest): string {
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
      // 新建会话时只创建文档壳子，不再偷偷塞默认正文，避免用户误以为这些内容来自真实分析结果。
      insertDocument.run(
        sessionId,
        'analysis',
        DEFAULT_DOCUMENTS.analysis.title,
        DEFAULT_DOCUMENTS.analysis.fileName,
        '',
        ''
      )
      insertDocument.run(
        sessionId,
        'design',
        DEFAULT_DOCUMENTS.design.title,
        DEFAULT_DOCUMENTS.design.fileName,
        '',
        ''
      )
      insertDocument.run(
        sessionId,
        'verify',
        DEFAULT_DOCUMENTS.verify.title,
        DEFAULT_DOCUMENTS.verify.fileName,
        '',
        ''
      )
    })

    transaction()
    return sessionId
  }

  deleteSession(sessionId: string): void {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM generation_messages WHERE session_id = ?').run(sessionId)
      this.db.prepare('DELETE FROM generation_documents WHERE session_id = ?').run(sessionId)
      this.db.prepare('DELETE FROM generation_stage_configs WHERE session_id = ?').run(sessionId)
      this.db.prepare('DELETE FROM generation_sessions WHERE id = ?').run(sessionId)
    })

    transaction()
  }

  getSessionDetail(sessionId: string): GenerationSessionDetail {
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
      ...mapSessionSummary(sessionRow),
      stageConfigs: stageConfigRows.map(mapStageConfig),
      documents: documentRows.map(mapDocument),
      messages: messageRows.map(mapMessage)
    }
  }

  updateSessionState(request: GenerationUpdateSessionStateRequest) {
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
    return mapSessionSummary(updated)
  }

  saveStageConfig(request: GenerationSaveStageConfigRequest): GenerationStageConfig {
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
    return mapStageConfig(row)
  }

  saveDocument(request: GenerationSaveDocumentRequest): GenerationDocument {
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
    return mapDocument(row)
  }

  listMessages(request: GenerationListMessagesRequest) {
    const rows = this.db
      .prepare(
        `SELECT * FROM generation_messages
         WHERE session_id = ? AND channel_key = ?
         ORDER BY created_at ASC`
      )
      .all(request.sessionId, request.channelKey) as GenerationMessageRow[]
    return rows.map(mapMessage)
  }

  insertMessage(row: Omit<GenerationMessageRow, 'created_at' | 'updated_at'>): void {
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

  updateMessageContent(messageId: string, content: string): void {
    this.db
      .prepare(
        `UPDATE generation_messages
         SET content = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(content, messageId)
  }

  updateMessageMeta(messageId: string, metaJson: string | null): void {
    this.db
      .prepare(
        `UPDATE generation_messages
         SET meta_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(metaJson, messageId)
  }

  markMessageError(messageId: string, message: string): void {
    this.db
      .prepare(
        `UPDATE generation_messages
         SET status = 'error', error = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(message, messageId)
  }

  finishMessage(params: {
    messageId: string
    content: string
    status: 'final' | 'aborted' | 'error'
    usage?: Record<string, unknown>
  }): void {
    this.db
      .prepare(
        `UPDATE generation_messages
         SET content = ?, status = ?, usage_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        params.content,
        params.status,
        params.usage ? JSON.stringify(params.usage) : null,
        params.messageId
      )
  }

  touchSession(sessionId: string): void {
    this.db
      .prepare(`UPDATE generation_sessions SET updated_at = datetime('now') WHERE id = ?`)
      .run(sessionId)
  }
}
