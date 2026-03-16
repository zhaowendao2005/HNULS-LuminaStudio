import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type {
  GenerationAnalysisDocument,
  GenerationChannelKey,
  GenerationDesignDocument,
  GenerationGlobalSettings,
  GenerationMessage,
  GenerationMessageMetaPayload,
  GenerationMessageStatus,
  GenerationSessionDetail,
  GenerationSessionSummary,
  GenerationStageConfig,
  GenerationStageKey
} from '@preload/types'
import type {
  GenerationAnalysisDocumentRow,
  GenerationDesignDocumentRow,
  GenerationGlobalSettingsRow,
  GenerationMessageRow,
  GenerationSessionRow,
  GenerationStageConfigRow
} from '../types/database.types'

function nowIso(): string {
  return new Date().toISOString()
}

function mapStageConfig(row: GenerationStageConfigRow): GenerationStageConfig {
  return {
    stageKey: row.stage_key as GenerationStageKey,
    providerId: row.provider_id,
    modelId: row.model_id,
    memoryRounds: row.memory_rounds,
    maxRepairIterations: row.max_repair_iterations,
    budgetLimitTokens: row.budget_limit_tokens
  }
}

function mapAnalysisDocument(row: GenerationAnalysisDocumentRow): GenerationAnalysisDocument {
  return {
    documentKey: 'analysis',
    title: row.title,
    content: row.content,
    summary: row.summary,
    updatedAt: row.updated_at
  }
}

function mapDesignDocument(row: GenerationDesignDocumentRow): GenerationDesignDocument {
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    content: row.content,
    contentFormat: row.content_format as GenerationDesignDocument['contentFormat'],
    summary: row.summary,
    status: row.status as GenerationDesignDocument['status'],
    validationJson: row.validation_json,
    planningSourceMessageId: row.planning_source_message_id,
    derivedTargetType: row.derived_target_type as GenerationDesignDocument['derivedTargetType'],
    derivedTargetId: row.derived_target_id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapMessage(row: GenerationMessageRow): GenerationMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    channelKey: row.channel_key as GenerationChannelKey,
    role: row.role as GenerationMessage['role'],
    status: row.status as GenerationMessageStatus,
    content: row.content,
    metaJson: row.meta_json,
    requestId: row.request_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class GenerationEditorRepository {
  constructor(private readonly db: Database.Database) {}

  getGlobalSettings(): GenerationGlobalSettings {
    const row = this.db
      .prepare(
        'SELECT id, persist_raw_llm_data, updated_at FROM generation_global_settings WHERE id = 1'
      )
      .get() as GenerationGlobalSettingsRow | undefined

    if (!row) {
      const insertedAt = nowIso()
      this.db
        .prepare(
          'INSERT INTO generation_global_settings (id, persist_raw_llm_data, updated_at) VALUES (1, 0, ?)'
        )
        .run(insertedAt)
      return {
        persistRawLlmData: false
      }
    }

    return {
      persistRawLlmData: row.persist_raw_llm_data === 1
    }
  }

  updateGlobalSettings(settings: Partial<GenerationGlobalSettings>): GenerationGlobalSettings {
    const current = this.getGlobalSettings()
    const next: GenerationGlobalSettings = {
      persistRawLlmData: settings.persistRawLlmData ?? current.persistRawLlmData
    }
    this.db
      .prepare(
        'INSERT OR REPLACE INTO generation_global_settings (id, persist_raw_llm_data, updated_at) VALUES (1, ?, ?)'
      )
      .run(next.persistRawLlmData ? 1 : 0, nowIso())
    return next
  }

  listSessions(): GenerationSessionSummary[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          s.*,
          (
            SELECT COUNT(*)
            FROM generation_messages m
            WHERE m.session_id = s.id
              AND m.channel_key = 'analysis-planner'
              AND m.role = 'user'
          ) AS analysis_turn_count,
          (
            SELECT COUNT(*)
            FROM generation_design_documents d
            WHERE d.session_id = s.id
          ) AS design_version_count
        FROM generation_sessions s
        ORDER BY s.updated_at DESC
      `
      )
      .all() as Array<GenerationSessionRow & { analysis_turn_count: number; design_version_count: number }>

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      currentStage: row.current_stage as GenerationStageKey,
      summary: row.summary,
      analysisTurnCount: row.analysis_turn_count,
      designVersionCount: row.design_version_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  createSession(params: {
    title: string
    stageConfigs: GenerationStageConfig[]
    analysisDocument: GenerationAnalysisDocument
  }): GenerationSessionDetail {
    const sessionId = randomUUID()
    const createdAt = nowIso()

    const transaction = this.db.transaction(() => {
      this.db
        .prepare(
          `
            INSERT INTO generation_sessions (
              id, title, current_stage, summary, selected_design_document_id, created_at, updated_at
            ) VALUES (?, ?, 'analysis', '', NULL, ?, ?)
          `
        )
        .run(sessionId, params.title.trim(), createdAt, createdAt)

      const insertConfig = this.db.prepare(
        `
          INSERT INTO generation_stage_configs (
            session_id, stage_key, provider_id, model_id, memory_rounds,
            max_repair_iterations, budget_limit_tokens, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      params.stageConfigs.forEach((config) => {
        insertConfig.run(
          sessionId,
          config.stageKey,
          config.providerId,
          config.modelId,
          config.memoryRounds,
          config.maxRepairIterations,
          config.budgetLimitTokens,
          createdAt,
          createdAt
        )
      })

      this.db
        .prepare(
          `
            INSERT INTO generation_analysis_documents (
              session_id, title, content, summary, updated_at
            ) VALUES (?, ?, ?, ?, ?)
          `
        )
        .run(
          sessionId,
          params.analysisDocument.title,
          params.analysisDocument.content,
          params.analysisDocument.summary,
          createdAt
        )
    })

    transaction()
    return this.getSessionDetail(sessionId)
  }

  deleteSession(sessionId: string): void {
    this.db.prepare('DELETE FROM generation_sessions WHERE id = ?').run(sessionId)
  }

  getSessionDetail(sessionId: string): GenerationSessionDetail {
    const sessionRow = this.db
      .prepare('SELECT * FROM generation_sessions WHERE id = ?')
      .get(sessionId) as GenerationSessionRow | undefined
    if (!sessionRow) {
      throw new Error(`Generate 会话不存在：${sessionId}`)
    }

    const stageConfigs = this.db
      .prepare('SELECT * FROM generation_stage_configs WHERE session_id = ? ORDER BY stage_key ASC')
      .all(sessionId) as GenerationStageConfigRow[]
    const analysisDocumentRow = this.db
      .prepare('SELECT * FROM generation_analysis_documents WHERE session_id = ?')
      .get(sessionId) as GenerationAnalysisDocumentRow | undefined
    const designDocumentRows = this.db
      .prepare(
        'SELECT * FROM generation_design_documents WHERE session_id = ? ORDER BY version DESC, updated_at DESC'
      )
      .all(sessionId) as GenerationDesignDocumentRow[]
    const messageRows = this.db
      .prepare('SELECT * FROM generation_messages WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as GenerationMessageRow[]

    return {
      id: sessionRow.id,
      title: sessionRow.title,
      currentStage: sessionRow.current_stage as GenerationStageKey,
      summary: sessionRow.summary,
      analysisTurnCount: messageRows.filter(
        (row) => row.channel_key === 'analysis-planner' && row.role === 'user'
      ).length,
      designVersionCount: designDocumentRows.length,
      createdAt: sessionRow.created_at,
      updatedAt: sessionRow.updated_at,
      stageConfigs: stageConfigs.map(mapStageConfig),
      analysisDocument: analysisDocumentRow
        ? mapAnalysisDocument(analysisDocumentRow)
        : {
            documentKey: 'analysis',
            title: '需求分析',
            content: '',
            summary: '',
            updatedAt: sessionRow.updated_at
          },
      designDocuments: designDocumentRows.map(mapDesignDocument),
      selectedDesignDocumentId: sessionRow.selected_design_document_id,
      messages: messageRows.map(mapMessage)
    }
  }

  updateSessionState(sessionId: string, currentStage: GenerationStageKey): GenerationSessionDetail {
    this.db
      .prepare('UPDATE generation_sessions SET current_stage = ?, updated_at = ? WHERE id = ?')
      .run(currentStage, nowIso(), sessionId)
    return this.getSessionDetail(sessionId)
  }

  updateSessionSummary(sessionId: string, summary: string): void {
    this.db
      .prepare('UPDATE generation_sessions SET summary = ?, updated_at = ? WHERE id = ?')
      .run(summary, nowIso(), sessionId)
  }

  saveStageConfig(sessionId: string, config: GenerationStageConfig): GenerationStageConfig {
    const updatedAt = nowIso()
    this.db
      .prepare(
        `
          INSERT OR REPLACE INTO generation_stage_configs (
            session_id, stage_key, provider_id, model_id, memory_rounds,
            max_repair_iterations, budget_limit_tokens, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, COALESCE(
              (SELECT created_at FROM generation_stage_configs WHERE session_id = ? AND stage_key = ?),
              ?
            ), ?
          )
        `
      )
      .run(
        sessionId,
        config.stageKey,
        config.providerId,
        config.modelId,
        config.memoryRounds,
        config.maxRepairIterations,
        config.budgetLimitTokens,
        sessionId,
        config.stageKey,
        updatedAt,
        updatedAt
      )
    this.touchSession(sessionId)
    return config
  }

  saveAnalysisDocument(
    sessionId: string,
    document: GenerationAnalysisDocument
  ): GenerationAnalysisDocument {
    const updatedAt = nowIso()
    this.db
      .prepare(
        `
          INSERT OR REPLACE INTO generation_analysis_documents (
            session_id, title, content, summary, updated_at
          ) VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(sessionId, document.title, document.content, document.summary, updatedAt)
    this.updateSessionSummary(sessionId, document.summary)
    return {
      ...document,
      updatedAt
    }
  }

  createDesignDocument(params: {
    sessionId: string
    title: string
    planningSourceMessageId?: string | null
  }): GenerationDesignDocument {
    const existingVersion = this.db
      .prepare('SELECT MAX(version) as version FROM generation_design_documents WHERE session_id = ?')
      .get(params.sessionId) as { version: number | null }
    const version = (existingVersion.version || 0) + 1
    const documentId = randomUUID()
    const timestamp = nowIso()

    this.db
      .prepare(
        `
          INSERT INTO generation_design_documents (
            id, session_id, title, content, content_format, summary, status,
            validation_json, planning_source_message_id, derived_target_type, derived_target_id,
            version, created_at, updated_at
          ) VALUES (?, ?, ?, '', 'of-workflow-toml-v1', '', 'draft', NULL, ?, NULL, NULL, ?, ?, ?)
        `
      )
      .run(documentId, params.sessionId, params.title, params.planningSourceMessageId || null, version, timestamp, timestamp)

    this.db
      .prepare('UPDATE generation_sessions SET selected_design_document_id = ?, updated_at = ? WHERE id = ?')
      .run(documentId, timestamp, params.sessionId)

    return mapDesignDocument(
      this.db
        .prepare('SELECT * FROM generation_design_documents WHERE id = ?')
        .get(documentId) as GenerationDesignDocumentRow
    )
  }

  saveDesignDocument(sessionId: string, document: GenerationDesignDocument): GenerationDesignDocument {
    const updatedAt = nowIso()
    this.db
      .prepare(
        `
          INSERT OR REPLACE INTO generation_design_documents (
            id, session_id, title, content, content_format, summary, status,
            validation_json, planning_source_message_id, derived_target_type, derived_target_id,
            version, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            COALESCE((SELECT created_at FROM generation_design_documents WHERE id = ?), ?),
            ?
          )
        `
      )
      .run(
        document.id,
        sessionId,
        document.title,
        document.content,
        document.contentFormat,
        document.summary,
        document.status,
        document.validationJson,
        document.planningSourceMessageId,
        document.derivedTargetType,
        document.derivedTargetId,
        document.version,
        document.id,
        updatedAt,
        updatedAt
      )
    this.touchSession(sessionId)
    return mapDesignDocument(
      this.db
        .prepare('SELECT * FROM generation_design_documents WHERE id = ?')
        .get(document.id) as GenerationDesignDocumentRow
    )
  }

  selectDesignDocument(sessionId: string, designDocumentId: string): GenerationSessionDetail {
    this.db
      .prepare('UPDATE generation_sessions SET selected_design_document_id = ?, updated_at = ? WHERE id = ?')
      .run(designDocumentId, nowIso(), sessionId)
    return this.getSessionDetail(sessionId)
  }

  deleteDesignDocument(sessionId: string, designDocumentId: string): void {
    this.db.prepare('DELETE FROM generation_design_documents WHERE id = ? AND session_id = ?').run(designDocumentId, sessionId)
    const detail = this.getSessionDetail(sessionId)
    const fallbackId = detail.designDocuments[0]?.id || null
    this.db
      .prepare('UPDATE generation_sessions SET selected_design_document_id = ?, updated_at = ? WHERE id = ?')
      .run(fallbackId, nowIso(), sessionId)
  }

  listMessages(sessionId: string, channelKey: GenerationChannelKey): GenerationMessage[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM generation_messages WHERE session_id = ? AND channel_key = ? ORDER BY created_at ASC'
      )
      .all(sessionId, channelKey) as GenerationMessageRow[]
    return rows.map(mapMessage)
  }

  insertMessage(params: {
    sessionId: string
    channelKey: GenerationChannelKey
    role: GenerationMessage['role']
    status: GenerationMessageStatus
    content: string
    requestId?: string | null
    meta?: GenerationMessageMetaPayload | null
  }): GenerationMessage {
    const id = randomUUID()
    const timestamp = nowIso()
    this.db
      .prepare(
        `
          INSERT INTO generation_messages (
            id, session_id, channel_key, role, status, content, meta_json, request_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        id,
        params.sessionId,
        params.channelKey,
        params.role,
        params.status,
        params.content,
        params.meta ? JSON.stringify(params.meta) : null,
        params.requestId || null,
        timestamp,
        timestamp
      )
    this.touchSession(params.sessionId)
    return mapMessage(
      this.db.prepare('SELECT * FROM generation_messages WHERE id = ?').get(id) as GenerationMessageRow
    )
  }

  getMessageById(messageId: string): GenerationMessage {
    const row = this.db
      .prepare('SELECT * FROM generation_messages WHERE id = ?')
      .get(messageId) as GenerationMessageRow | undefined
    if (!row) {
      throw new Error(`Generate 消息不存在：${messageId}`)
    }
    return mapMessage(row)
  }

  updateMessageContent(messageId: string, content: string): GenerationMessage {
    this.db
      .prepare('UPDATE generation_messages SET content = ?, updated_at = ? WHERE id = ?')
      .run(content, nowIso(), messageId)
    return this.getMessageById(messageId)
  }

  updateMessageMeta(messageId: string, meta: GenerationMessageMetaPayload): GenerationMessage {
    this.db
      .prepare('UPDATE generation_messages SET meta_json = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(meta), nowIso(), messageId)
    return this.getMessageById(messageId)
  }

  finishMessage(messageId: string, status: Extract<GenerationMessageStatus, 'completed' | 'aborted'>): GenerationMessage {
    this.db
      .prepare('UPDATE generation_messages SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, nowIso(), messageId)
    return this.getMessageById(messageId)
  }

  failMessage(messageId: string, errorMessage: string): GenerationMessage {
    const current = this.getMessageById(messageId)
    this.db
      .prepare('UPDATE generation_messages SET status = ?, content = ?, updated_at = ? WHERE id = ?')
      .run('failed', current.content || errorMessage, nowIso(), messageId)
    return this.getMessageById(messageId)
  }

  private touchSession(sessionId: string): void {
    this.db
      .prepare('UPDATE generation_sessions SET updated_at = ? WHERE id = ?')
      .run(nowIso(), sessionId)
  }
}
