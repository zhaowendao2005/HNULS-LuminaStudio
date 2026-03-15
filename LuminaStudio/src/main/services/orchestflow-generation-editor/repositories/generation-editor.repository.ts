import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import {
  applyOFPlanningEditCommands,
  buildOFPlanningMarkdown,
  createEmptyOFPlanningDocument,
  parseOFPlanningMarkdown,
  type OFPlanningDocument,
  type OFPlanningEditCommand,
  type OFPlanningSectionKey
} from '@shared/Orchestraflow-types'
import type {
  GenerationApplyPlanningCommandProposalRequest,
  GenerationCreateDesignDocumentFromPlanningRequest,
  GenerationCreatePlanningDocumentFromMessageRequest,
  GenerationCreateSessionRequest,
  GenerationDeleteDesignDocumentRequest,
  GenerationDesignDocument,
  GenerationDocument,
  GenerationGlobalSettings,
  GenerationListDesignDocumentsRequest,
  GenerationListMessagesRequest,
  GenerationMessage,
  GenerationMessageMetaPayload,
  GenerationPlanningDocument,
  GenerationRejectPlanningCommandProposalRequest,
  GenerationSaveDesignDocumentRequest,
  GenerationSaveDocumentRequest,
  GenerationSavePlanningDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSelectDesignDocumentRequest,
  GenerationSelectPlanningDocumentRequest,
  GenerationSessionDetail,
  GenerationStageConfig,
  GenerationStageKey,
  GenerationUpdateSessionStateRequest
} from '@preload/types'
import { DEFAULT_DOCUMENTS, DEFAULT_STAGE_CONFIGS } from '../constants/defaults'
import {
  mapDesignDocument,
  mapDocument,
  mapGlobalSettings,
  mapMessage,
  mapPlanningDocument,
  mapSessionSummary,
  mapStageConfig
} from '../mappers/generation-editor.mappers'
import type {
  GenerationDesignDocumentRow,
  GenerationDocumentRow,
  GenerationGlobalSettingsRow,
  GenerationMessageRow,
  GenerationPlanningDocumentRow,
  GenerationSessionRow,
  GenerationStageConfigRow
} from '../types/database.types'

/**
 * repository 层专门负责 Generate Editor 的 SQLite 访问。
 *
 * 这里把 planning 工作稿和 design 多版本稿都收敛到一处，
 * 避免 service 层重复维护 SQL / JSON meta / 回落逻辑。
 */
export class GenerationEditorRepository {
  constructor(private readonly db: Database.Database) {}

  getGlobalSettings(): GenerationGlobalSettings {
    const row = this.db.prepare('SELECT * FROM generation_global_settings WHERE id = 1').get() as
      | GenerationGlobalSettingsRow
      | undefined

    if (!row) {
      this.db
        .prepare(
          `INSERT INTO generation_global_settings (id, persist_raw_llm_data)
           VALUES (1, 0)
           ON CONFLICT(id) DO NOTHING`
        )
        .run()

      const inserted = this.db
        .prepare('SELECT * FROM generation_global_settings WHERE id = 1')
        .get() as GenerationGlobalSettingsRow
      return mapGlobalSettings(inserted)
    }

    return mapGlobalSettings(row)
  }

  updateGlobalSettings(settings: Partial<GenerationGlobalSettings>): GenerationGlobalSettings {
    const current = this.getGlobalSettings()
    this.db
      .prepare(
        `INSERT INTO generation_global_settings (id, persist_raw_llm_data, updated_at)
         VALUES (1, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           persist_raw_llm_data = excluded.persist_raw_llm_data,
           updated_at = datetime('now')`
      )
      .run((settings.persistRawLlmData ?? current.persistRawLlmData) ? 1 : 0)

    return this.getGlobalSettings()
  }

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
          session_id,
          stage_key,
          provider_id,
          model_id,
          sdk_vendor,
          memory_rounds,
          copilot_memory_rounds,
          auto_approved,
          active_planning_document_id,
          active_design_document_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          config.autoApproved ? 1 : 0,
          config.activePlanningDocumentId,
          config.activeDesignDocumentId
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
      this.db.prepare('DELETE FROM generation_design_documents WHERE session_id = ?').run(sessionId)
      this.db
        .prepare('DELETE FROM generation_planning_documents WHERE session_id = ?')
        .run(sessionId)
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
    const planningDocumentRows = this.db
      .prepare(
        'SELECT * FROM generation_planning_documents WHERE session_id = ? ORDER BY updated_at DESC'
      )
      .all(sessionId) as GenerationPlanningDocumentRow[]
    const designDocumentRows = this.db
      .prepare(
        'SELECT * FROM generation_design_documents WHERE session_id = ? ORDER BY updated_at DESC, version DESC'
      )
      .all(sessionId) as GenerationDesignDocumentRow[]
    const messageRows = this.db
      .prepare('SELECT * FROM generation_messages WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as GenerationMessageRow[]

    return {
      ...mapSessionSummary(sessionRow),
      stageConfigs: stageConfigRows.map(mapStageConfig),
      documents: documentRows.map(mapDocument),
      planningDocuments: planningDocumentRows.map(mapPlanningDocument),
      designDocuments: designDocumentRows.map(mapDesignDocument),
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
          session_id,
          stage_key,
          provider_id,
          model_id,
          sdk_vendor,
          memory_rounds,
          copilot_memory_rounds,
          auto_approved,
          active_planning_document_id,
          active_design_document_id,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(session_id, stage_key) DO UPDATE SET
          provider_id = excluded.provider_id,
          model_id = excluded.model_id,
          sdk_vendor = excluded.sdk_vendor,
          memory_rounds = excluded.memory_rounds,
          copilot_memory_rounds = excluded.copilot_memory_rounds,
          auto_approved = excluded.auto_approved,
          active_planning_document_id = excluded.active_planning_document_id,
          active_design_document_id = excluded.active_design_document_id,
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
        request.config.autoApproved ? 1 : 0,
        request.config.activePlanningDocumentId,
        request.config.activeDesignDocumentId
      )

    this.touchSession(request.sessionId)
    return this.getStageConfig(request.sessionId, request.config.stageKey)
  }

  getStageConfig(sessionId: string, stageKey: GenerationStageKey): GenerationStageConfig {
    const row = this.db
      .prepare('SELECT * FROM generation_stage_configs WHERE session_id = ? AND stage_key = ?')
      .get(sessionId, stageKey) as GenerationStageConfigRow | undefined

    if (!row) {
      throw new Error(`Stage config not found: ${sessionId}/${stageKey}`)
    }

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

  savePlanningDocument(request: GenerationSavePlanningDocumentRequest): GenerationPlanningDocument {
    this.db
      .prepare(
        `INSERT INTO generation_planning_documents (
          id,
          session_id,
          stage_key,
          source_message_id,
          title,
          source_markdown,
          content,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          source_markdown = excluded.source_markdown,
          content = excluded.content,
          updated_at = datetime('now')`
      )
      .run(
        request.document.id,
        request.sessionId,
        request.document.stageKey,
        request.document.sourceMessageId,
        request.document.title,
        request.document.sourceMarkdown,
        request.document.content
      )

    this.touchSession(request.sessionId)
    return this.getPlanningDocumentById(request.document.id)
  }

  selectPlanningDocument(request: GenerationSelectPlanningDocumentRequest): GenerationStageConfig {
    this.db
      .prepare(
        `UPDATE generation_stage_configs
         SET active_planning_document_id = ?, updated_at = datetime('now')
         WHERE session_id = ? AND stage_key = ?`
      )
      .run(request.documentId, request.sessionId, request.stageKey)

    this.touchSession(request.sessionId)
    return this.getStageConfig(request.sessionId, request.stageKey)
  }

  getPlanningDocumentById(documentId: string): GenerationPlanningDocument {
    const row = this.db
      .prepare('SELECT * FROM generation_planning_documents WHERE id = ?')
      .get(documentId) as GenerationPlanningDocumentRow | undefined

    if (!row) {
      throw new Error(`Planning document not found: ${documentId}`)
    }

    return mapPlanningDocument(row)
  }

  listDesignDocuments(request: GenerationListDesignDocumentsRequest): GenerationDesignDocument[] {
    const rows = request.planningDocumentId
      ? (this.db
          .prepare(
            `SELECT * FROM generation_design_documents
             WHERE session_id = ? AND planning_document_id = ?
             ORDER BY version DESC, updated_at DESC`
          )
          .all(request.sessionId, request.planningDocumentId) as GenerationDesignDocumentRow[])
      : (this.db
          .prepare(
            `SELECT * FROM generation_design_documents
             WHERE session_id = ?
             ORDER BY updated_at DESC, version DESC`
          )
          .all(request.sessionId) as GenerationDesignDocumentRow[])

    return rows.map(mapDesignDocument)
  }

  getDesignDocumentById(designDocumentId: string): GenerationDesignDocument {
    const row = this.db
      .prepare('SELECT * FROM generation_design_documents WHERE id = ?')
      .get(designDocumentId) as GenerationDesignDocumentRow | undefined

    if (!row) {
      throw new Error(`Design document not found: ${designDocumentId}`)
    }

    return mapDesignDocument(row)
  }

  createDesignDocumentFromPlanning(
    request: GenerationCreateDesignDocumentFromPlanningRequest
  ): GenerationDesignDocument {
    const planningDocument = this.getPlanningDocumentById(request.planningDocumentId)
    if (planningDocument.sessionId !== request.sessionId) {
      throw new Error(`Planning document not found in session: ${request.planningDocumentId}`)
    }

    const versionRow = this.db
      .prepare(
        `SELECT MAX(version) as maxVersion
         FROM generation_design_documents
         WHERE session_id = ? AND planning_document_id = ?`
      )
      .get(request.sessionId, request.planningDocumentId) as { maxVersion: number | null }
    const nextVersion = (versionRow.maxVersion || 0) + 1
    const designDocumentId = randomUUID()
    const title = `规划设计 V${nextVersion}`

    // 设计稿首版直接复制 planning markdown，确保后续 planning 变化不会回写污染旧版本。
    this.db
      .prepare(
        `INSERT INTO generation_design_documents (
          id,
          session_id,
          planning_document_id,
          planning_source_message_id,
          title,
          version,
          status,
          source_snapshot_markdown,
          content_format,
          content,
          summary,
          diagnostics_json,
          latest_generation_message_id
        ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, NULL, NULL)`
      )
      .run(
        designDocumentId,
        request.sessionId,
        planningDocument.id,
        planningDocument.sourceMessageId,
        title,
        nextVersion,
        planningDocument.content,
        'of-blueprint-section-v1',
        '',
        ''
      )

    this.selectDesignDocument({
      sessionId: request.sessionId,
      designDocumentId
    })

    return this.getDesignDocumentById(designDocumentId)
  }

  saveDesignDocument(request: GenerationSaveDesignDocumentRequest): GenerationDesignDocument {
    this.db
      .prepare(
        `INSERT INTO generation_design_documents (
          id,
          session_id,
          planning_document_id,
          planning_source_message_id,
          title,
          version,
          status,
          source_snapshot_markdown,
          content_format,
          content,
          summary,
          diagnostics_json,
          latest_generation_message_id,
          derived_target_type,
          derived_target_id,
          derived_status,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          status = excluded.status,
          source_snapshot_markdown = excluded.source_snapshot_markdown,
          content_format = excluded.content_format,
          content = excluded.content,
          summary = excluded.summary,
          diagnostics_json = excluded.diagnostics_json,
          latest_generation_message_id = excluded.latest_generation_message_id,
          derived_target_type = excluded.derived_target_type,
          derived_target_id = excluded.derived_target_id,
          derived_status = excluded.derived_status,
          updated_at = datetime('now')`
      )
      .run(
        request.document.id,
        request.sessionId,
        request.document.planningDocumentId,
        request.document.planningSourceMessageId,
        request.document.title,
        request.document.version,
        request.document.status,
        request.document.sourceSnapshotMarkdown,
        request.document.contentFormat,
        request.document.content,
        request.document.summary,
        request.document.diagnosticsJson,
        request.document.latestGenerationMessageId,
        request.document.derivedTargetType,
        request.document.derivedTargetId,
        request.document.derivedStatus
      )

    const saved = this.getDesignDocumentById(request.document.id)
    if (this.getStageConfig(request.sessionId, 'design').activeDesignDocumentId === saved.id) {
      this.syncDesignStageDocument(saved)
    }

    this.touchSession(request.sessionId)
    return saved
  }

  selectDesignDocument(request: GenerationSelectDesignDocumentRequest): GenerationStageConfig {
    const designDocument = this.getDesignDocumentById(request.designDocumentId)
    if (designDocument.sessionId !== request.sessionId) {
      throw new Error(`Design document not found in session: ${request.designDocumentId}`)
    }

    this.db
      .prepare(
        `UPDATE generation_stage_configs
         SET active_design_document_id = ?, updated_at = datetime('now')
         WHERE session_id = ? AND stage_key = 'design'`
      )
      .run(request.designDocumentId, request.sessionId)

    this.syncDesignStageDocument(designDocument)
    this.touchSession(request.sessionId)
    return this.getStageConfig(request.sessionId, 'design')
  }

  deleteDesignDocument(request: GenerationDeleteDesignDocumentRequest): void {
    const designDocument = this.getDesignDocumentById(request.designDocumentId)
    if (designDocument.sessionId !== request.sessionId) {
      throw new Error(`Design document not found in session: ${request.designDocumentId}`)
    }

    const currentStageConfig = this.getStageConfig(request.sessionId, 'design')
    this.db
      .prepare('DELETE FROM generation_design_documents WHERE id = ? AND session_id = ?')
      .run(request.designDocumentId, request.sessionId)

    if (currentStageConfig.activeDesignDocumentId === request.designDocumentId) {
      const fallback = this.listDesignDocuments({
        sessionId: request.sessionId,
        planningDocumentId: designDocument.planningDocumentId
      })[0]

      if (fallback) {
        this.selectDesignDocument({
          sessionId: request.sessionId,
          designDocumentId: fallback.id
        })
      } else {
        this.db
          .prepare(
            `UPDATE generation_stage_configs
             SET active_design_document_id = NULL, updated_at = datetime('now')
             WHERE session_id = ? AND stage_key = 'design'`
          )
          .run(request.sessionId)
        this.clearDesignStageDocument(request.sessionId)
      }
    }

    this.touchSession(request.sessionId)
  }

  getOrCreatePlanningDocumentFromMessage(
    request: GenerationCreatePlanningDocumentFromMessageRequest
  ): GenerationPlanningDocument {
    const existing = this.db
      .prepare(
        'SELECT * FROM generation_planning_documents WHERE session_id = ? AND source_message_id = ?'
      )
      .get(request.sessionId, request.messageId) as GenerationPlanningDocumentRow | undefined

    if (existing) {
      this.selectPlanningDocument({
        sessionId: request.sessionId,
        stageKey: existing.stage_key,
        documentId: existing.id
      })
      this.attachPlanningDocumentIdToMessage(existing.source_message_id, existing.id)
      return mapPlanningDocument(existing)
    }

    const message = this.getMessageById(request.messageId)
    if (!message || message.session_id !== request.sessionId) {
      throw new Error(`Planning source message not found: ${request.messageId}`)
    }

    const planningState = extractPlanningDocumentSource(message)
    const documentId = randomUUID()
    const title = `需求分析工作稿-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`

    this.db
      .prepare(
        `INSERT INTO generation_planning_documents (
          id,
          session_id,
          stage_key,
          source_message_id,
          title,
          source_markdown,
          content
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        documentId,
        request.sessionId,
        'analysis',
        request.messageId,
        title,
        planningState.markdown,
        planningState.markdown
      )

    this.attachPlanningDocumentIdToMessage(request.messageId, documentId)
    this.selectPlanningDocument({
      sessionId: request.sessionId,
      stageKey: 'analysis',
      documentId
    })

    return this.getPlanningDocumentById(documentId)
  }

  applyPlanningCommandProposal(
    request: GenerationApplyPlanningCommandProposalRequest
  ): GenerationPlanningDocument {
    const message = this.getMessageById(request.messageId)
    if (!message || message.session_id !== request.sessionId) {
      throw new Error(`Planning proposal message not found: ${request.messageId}`)
    }

    const meta = parseMessageMeta(message.meta_json)
    const editBlock = meta.copilotEditBlock
    if (!editBlock || editBlock.kind !== 'planning-edit') {
      throw new Error('Planning proposal meta missing')
    }

    const targetSectionKeys = resolveTargetPlanningSectionKeys(editBlock, request.sectionKeys)
    const currentDocument = this.getPlanningDocumentById(editBlock.documentId)
    const sourceDocument = parseOFPlanningMarkdown(currentDocument.sourceMarkdown).document
    const nextCommands = filterPlanningCommandsBySectionKeys(editBlock.commands, targetSectionKeys)
    const nextSharedDocument = applyOFPlanningEditCommands(
      { sections: { ...currentDocument.sections } },
      nextCommands,
      {
        sourceDocument
      }
    )
    const nextMarkdown = buildOFPlanningMarkdown(nextSharedDocument)

    const savedDocument = this.savePlanningDocument({
      sessionId: request.sessionId,
      document: {
        ...currentDocument,
        sections: nextSharedDocument.sections,
        content: nextMarkdown
      }
    })

    meta.copilotEditBlock = {
      ...editBlock,
      status: resolvePlanningReviewStatus(
        updateSectionDecisionByKey(editBlock, targetSectionKeys, 'applied')
      ),
      sectionDecisionByKey: updateSectionDecisionByKey(editBlock, targetSectionKeys, 'applied'),
      errorMessage: null
    }
    this.updateMessageMeta(request.messageId, JSON.stringify(meta))
    return savedDocument
  }

  rejectPlanningCommandProposal(
    request: GenerationRejectPlanningCommandProposalRequest
  ): GenerationMessage {
    const message = this.getMessageById(request.messageId)
    if (!message || message.session_id !== request.sessionId) {
      throw new Error(`Planning proposal message not found: ${request.messageId}`)
    }

    const meta = parseMessageMeta(message.meta_json)
    if (meta.copilotEditBlock) {
      const targetSectionKeys = resolveTargetPlanningSectionKeys(
        meta.copilotEditBlock,
        request.sectionKeys
      )
      meta.copilotEditBlock = {
        ...meta.copilotEditBlock,
        status: resolvePlanningReviewStatus(
          updateSectionDecisionByKey(meta.copilotEditBlock, targetSectionKeys, 'rejected')
        ),
        sectionDecisionByKey: updateSectionDecisionByKey(
          meta.copilotEditBlock,
          targetSectionKeys,
          'rejected'
        ),
        errorMessage: null
      }
      this.updateMessageMeta(request.messageId, JSON.stringify(meta))
    }

    return mapMessage(this.getRequiredMessageById(request.messageId))
  }

  listMessages(request: GenerationListMessagesRequest) {
    const rows =
      request.channelKey === 'design-copilot' && request.designDocumentId !== undefined
        ? request.designDocumentId === null
          ? (this.db
              .prepare(
                `SELECT * FROM generation_messages
                   WHERE session_id = ? AND channel_key = ? AND design_document_id IS NULL
                   ORDER BY created_at ASC`
              )
              .all(request.sessionId, request.channelKey) as GenerationMessageRow[])
          : (this.db
              .prepare(
                `SELECT * FROM generation_messages
                   WHERE session_id = ? AND channel_key = ? AND design_document_id = ?
                   ORDER BY created_at ASC`
              )
              .all(
                request.sessionId,
                request.channelKey,
                request.designDocumentId
              ) as GenerationMessageRow[])
        : (this.db
            .prepare(
              `SELECT * FROM generation_messages
               WHERE session_id = ? AND channel_key = ?
               ORDER BY created_at ASC`
            )
            .all(request.sessionId, request.channelKey) as GenerationMessageRow[])
    return rows.map(mapMessage)
  }

  getMessageById(messageId: string): GenerationMessageRow | undefined {
    return this.db.prepare('SELECT * FROM generation_messages WHERE id = ?').get(messageId) as
      | GenerationMessageRow
      | undefined
  }

  insertMessage(row: Omit<GenerationMessageRow, 'created_at' | 'updated_at'>): void {
    this.db
      .prepare(
        `INSERT INTO generation_messages (
          id, session_id, channel_key, design_document_id, request_id, role, content, status, provider_id, model_id, error, usage_json, meta_json, raw_response_text, raw_trace_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.session_id,
        row.channel_key,
        row.design_document_id,
        row.request_id,
        row.role,
        row.content,
        row.status,
        row.provider_id,
        row.model_id,
        row.error,
        row.usage_json,
        row.meta_json,
        row.raw_response_text,
        row.raw_trace_json
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
    rawResponseText?: string | null
    rawTrace?: unknown[] | null
  }): void {
    this.db
      .prepare(
        `UPDATE generation_messages
         SET content = ?, status = ?, usage_json = ?, raw_response_text = ?, raw_trace_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        params.content,
        params.status,
        params.usage ? JSON.stringify(params.usage) : null,
        params.rawResponseText ?? null,
        params.rawTrace ? JSON.stringify(params.rawTrace) : null,
        params.messageId
      )
  }

  discardMessageAsFailed(messageId: string, errorMessage: string): void {
    this.db
      .prepare(
        `UPDATE generation_messages
         SET content = '', status = 'error', error = ?, usage_json = NULL, raw_response_text = NULL, raw_trace_json = NULL, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(errorMessage, messageId)
  }

  touchSession(sessionId: string): void {
    this.db
      .prepare(`UPDATE generation_sessions SET updated_at = datetime('now') WHERE id = ?`)
      .run(sessionId)
  }

  private attachPlanningDocumentIdToMessage(messageId: string, documentId: string): void {
    const message = this.getRequiredMessageById(messageId)
    const meta = parseMessageMeta(message.meta_json)
    if (!meta.planningBlock) {
      return
    }

    meta.planningBlock = {
      ...meta.planningBlock,
      documentId
    }
    this.updateMessageMeta(messageId, JSON.stringify(meta))
  }

  private syncDesignStageDocument(designDocument: GenerationDesignDocument): void {
    // design 阶段旧正文继续保留为兼容镜像，避免其它逻辑突然读不到内容。
    const currentDocument = this.getDocumentByKey(designDocument.sessionId, 'design')
    this.saveDocument({
      sessionId: designDocument.sessionId,
      document: {
        documentKey: 'design',
        title: currentDocument?.title || '规划设计',
        fileName: currentDocument?.fileName || 'planning_design.md',
        summary: designDocument.summary,
        content: designDocument.content
      }
    })
  }

  private clearDesignStageDocument(sessionId: string): void {
    const currentDocument = this.getDocumentByKey(sessionId, 'design')
    this.saveDocument({
      sessionId,
      document: {
        documentKey: 'design',
        title: currentDocument?.title || '规划设计',
        fileName: currentDocument?.fileName || 'planning_design.md',
        summary: '',
        content: ''
      }
    })
  }

  private getDocumentByKey(
    sessionId: string,
    documentKey: GenerationStageKey
  ): GenerationDocument | null {
    const row = this.db
      .prepare('SELECT * FROM generation_documents WHERE session_id = ? AND document_key = ?')
      .get(sessionId, documentKey) as GenerationDocumentRow | undefined

    return row ? mapDocument(row) : null
  }

  private getRequiredMessageById(messageId: string): GenerationMessageRow {
    const row = this.getMessageById(messageId)
    if (!row) {
      throw new Error(`Message not found: ${messageId}`)
    }
    return row
  }
}

function parseMessageMeta(metaJson: string | null): GenerationMessageMetaPayload {
  if (!metaJson) {
    return {}
  }

  try {
    return JSON.parse(metaJson) as GenerationMessageMetaPayload
  } catch {
    return {}
  }
}

function resolveTargetPlanningSectionKeys(
  editBlock: NonNullable<GenerationMessageMetaPayload['copilotEditBlock']>,
  sectionKeys?: OFPlanningSectionKey[]
): OFPlanningSectionKey[] {
  const pendingSectionKeys = editBlock.affectedSectionKeys.filter((sectionKey) => {
    return (editBlock.sectionDecisionByKey?.[sectionKey] || 'pending') === 'pending'
  })

  if (!sectionKeys?.length) {
    return pendingSectionKeys
  }

  return sectionKeys.filter((sectionKey) => pendingSectionKeys.includes(sectionKey))
}

function filterPlanningCommandsBySectionKeys(
  commands: OFPlanningEditCommand[],
  sectionKeys: OFPlanningSectionKey[]
): OFPlanningEditCommand[] {
  if (!sectionKeys.length) {
    return []
  }

  return commands.filter((command) => {
    if ('sectionKey' in command) {
      return sectionKeys.includes(command.sectionKey)
    }
    if (command.type === 'noop') {
      return false
    }
    throw new Error('仅 section 级 planning 命令支持单独接受/取消')
  })
}

function updateSectionDecisionByKey(
  editBlock: NonNullable<GenerationMessageMetaPayload['copilotEditBlock']>,
  sectionKeys: OFPlanningSectionKey[],
  nextDecision: 'applied' | 'rejected'
): Partial<Record<OFPlanningSectionKey, 'pending' | 'applied' | 'rejected'>> {
  const nextMap: Partial<Record<OFPlanningSectionKey, 'pending' | 'applied' | 'rejected'>> = {
    ...editBlock.sectionDecisionByKey
  }

  editBlock.affectedSectionKeys.forEach((sectionKey) => {
    if (!nextMap[sectionKey]) {
      nextMap[sectionKey] = 'pending'
    }
  })

  sectionKeys.forEach((sectionKey) => {
    nextMap[sectionKey] = nextDecision
  })

  return nextMap
}

function resolvePlanningReviewStatus(
  sectionDecisionByKey: Partial<Record<OFPlanningSectionKey, 'pending' | 'applied' | 'rejected'>>
): 'pending' | 'applied' | 'rejected' {
  const decisions = Object.values(sectionDecisionByKey)
  if (decisions.some((decision) => decision === 'pending')) {
    return 'pending'
  }
  if (decisions.some((decision) => decision === 'applied')) {
    return 'applied'
  }
  return 'rejected'
}

function extractPlanningDocumentSource(message: GenerationMessageRow): {
  markdown: string
  document: OFPlanningDocument
} {
  const meta = parseMessageMeta(message.meta_json)
  const planningBlock = meta.planningBlock
  if (!planningBlock) {
    throw new Error('Planning block payload missing on source message')
  }

  if (planningBlock.analysisMarkdown || planningBlock.designMarkdown) {
    const markdown =
      `${planningBlock.analysisMarkdown.trim()}\n\n${planningBlock.designMarkdown.trim()}`.trim()
    const parsed = parseOFPlanningMarkdown(markdown)
    return {
      markdown,
      document: parsed.document
    }
  }

  if (planningBlock.requirementDocument) {
    const legacyDocument: OFPlanningDocument = createEmptyOFPlanningDocument()
    legacyDocument.sections['analysis-summary'] =
      '- 旧消息迁移：该规划块来自 v1 requirementDocument 结构。'
    legacyDocument.sections['analysis-goals'] = toMarkdownContent(
      planningBlock.requirementDocument.goals
    )
    legacyDocument.sections['analysis-success-criteria'] = toMarkdownContent(
      planningBlock.requirementDocument.success_criteria
    )
    legacyDocument.sections['analysis-constraints'] = toMarkdownContent(
      planningBlock.requirementDocument.constraints
    )
    legacyDocument.sections['analysis-prohibitions'] = toMarkdownContent(
      planningBlock.requirementDocument.prohibitions
    )
    legacyDocument.sections['analysis-missing-info'] = '- 暂无'
    legacyDocument.sections['analysis-readiness-signals'] = '- 暂无'
    legacyDocument.sections['design-candidate-nodes'] = toMarkdownContent(
      planningBlock.requirementDocument.candidate_nodes.map(
        (item) => `${item.type}：${item.reason}`
      )
    )
    legacyDocument.sections['design-input-requirements'] = toMarkdownContent(
      planningBlock.requirementDocument.input_requirements
    )
    legacyDocument.sections['design-output-requirements'] = toMarkdownContent(
      planningBlock.requirementDocument.output_requirements
    )
    legacyDocument.sections['design-confirmation-questions'] = toMarkdownContent(
      planningBlock.requirementDocument.human_confirmation_questions
    )
    legacyDocument.sections['design-blueprint-requirements'] = toMarkdownContent(
      planningBlock.requirementDocument.blueprint_requirements
    )
    return {
      markdown: buildOFPlanningMarkdown(legacyDocument),
      document: legacyDocument
    }
  }

  const emptyDocument = createEmptyOFPlanningDocument()
  const markdown = buildOFPlanningMarkdown(emptyDocument)
  return {
    markdown,
    document: emptyDocument
  }
}

function toMarkdownContent(items: string[]): string {
  if (!items.length) {
    return '- 暂无'
  }
  return items.map((item) => `- ${item}`).join('\n')
}
