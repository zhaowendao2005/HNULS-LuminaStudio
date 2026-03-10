import type Database from 'better-sqlite3'
import type {
  OFGenerationCheckpoint,
  OFGenerationOpLogEntry,
  OFGenerationSession,
  OFGenerationConversationMessage
} from '@shared/Orchestraflow-types'
import { normalizeOFGenerationSession } from '@shared/Orchestraflow-types'
import { logger } from '@main/services/logger'
import { databaseManager } from '@main/services/database-sqlite'

const log = logger.scope('OFGenerationSessionRepository')

interface GenerationSessionRow {
  id: string
  workflow_name: string
  description: string | null
  prompt: string
  status: OFGenerationSession['status']
  current_phase: OFGenerationSession['current_phase']
  schema_version: number
  compiled_workflow_id: string | null
  phase_state_json: string
  phase_models_json: string
  agent_configs_json: string
  graph_state_json: string
  preview_json: string
  validation_json: string
  artifacts_json: string
  created_at: number
  updated_at: number
}

interface GenerationMessageRow {
  id: string
  session_id: string
  agent_id: OFGenerationConversationMessage['agent_id']
  role: OFGenerationConversationMessage['role']
  content: string
  status: OFGenerationConversationMessage['status'] | null
  meta_json: string | null
  created_at: number
}

interface GenerationCheckpointRow {
  id: string
  session_id: string
  phase: OFGenerationCheckpoint['phase']
  label: string
  op_index: number
  created_at: number
}

interface GenerationOpLogRow {
  id: string
  session_id: string
  phase: OFGenerationOpLogEntry['phase']
  kind: OFGenerationOpLogEntry['kind']
  summary: string
  created_at: number
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T
}

export class GenerationSessionRepository {
  private readonly db: Database.Database

  constructor() {
    this.db = databaseManager.getDatabase('orchestraflow-runtime')
  }

  list(): OFGenerationSession[] {
    const rows = this.db
      .prepare('SELECT * FROM of_generation_sessions ORDER BY updated_at DESC')
      .all() as GenerationSessionRow[]
    return rows.map((row) => this.inflateSession(row))
  }

  get(id: string): OFGenerationSession | null {
    const row = this.db.prepare('SELECT * FROM of_generation_sessions WHERE id = ?').get(id) as
      | GenerationSessionRow
      | undefined
    return row ? this.inflateSession(row) : null
  }

  save(session: OFGenerationSession): OFGenerationSession {
    const normalized = normalizeOFGenerationSession(session)

    const saveTx = this.db.transaction(() => {
      this.db
        .prepare(
          `
          INSERT OR REPLACE INTO of_generation_sessions (
            id,
            workflow_name,
            description,
            prompt,
            status,
            current_phase,
            schema_version,
            compiled_workflow_id,
            phase_state_json,
            phase_models_json,
            agent_configs_json,
            graph_state_json,
            preview_json,
            validation_json,
            artifacts_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
        .run(
          normalized.id,
          normalized.workflow_name,
          normalized.description || null,
          normalized.prompt,
          normalized.status,
          normalized.current_phase,
          normalized.schema_version,
          normalized.compiled_workflow_id || null,
          JSON.stringify(normalized.phase_state),
          JSON.stringify(normalized.phase_models),
          JSON.stringify(normalized.agent_configs),
          JSON.stringify(normalized.graph_state),
          JSON.stringify(normalized.preview),
          JSON.stringify(normalized.validation),
          JSON.stringify(normalized.artifacts),
          normalized.created_at,
          normalized.updated_at
        )

      this.db.prepare('DELETE FROM of_generation_messages WHERE session_id = ?').run(normalized.id)
      this.db
        .prepare('DELETE FROM of_generation_checkpoints WHERE session_id = ?')
        .run(normalized.id)
      this.db.prepare('DELETE FROM of_generation_oplog WHERE session_id = ?').run(normalized.id)

      const insertMessage = this.db.prepare(
        `
        INSERT INTO of_generation_messages (
          id, session_id, agent_id, role, content, status, meta_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      for (const thread of Object.values(normalized.agent_threads)) {
        for (const message of thread.messages) {
          insertMessage.run(
            message.id,
            normalized.id,
            message.agent_id,
            message.role,
            message.content,
            message.status || null,
            message.meta ? JSON.stringify(message.meta) : null,
            message.created_at
          )
        }
      }

      const insertCheckpoint = this.db.prepare(
        `
        INSERT INTO of_generation_checkpoints (
          id, session_id, phase, label, op_index, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      for (const checkpoint of normalized.checkpoints) {
        insertCheckpoint.run(
          checkpoint.id,
          normalized.id,
          checkpoint.phase,
          checkpoint.label,
          checkpoint.op_index,
          checkpoint.created_at
        )
      }

      const insertOplog = this.db.prepare(
        `
        INSERT INTO of_generation_oplog (
          id, session_id, phase, kind, summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      for (const entry of normalized.op_log) {
        insertOplog.run(
          entry.id,
          normalized.id,
          entry.phase,
          entry.kind,
          entry.summary,
          entry.created_at
        )
      }
    })

    saveTx()
    return normalized
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM of_generation_sessions WHERE id = ?').run(id)
    return result.changes > 0
  }

  private inflateSession(row: GenerationSessionRow): OFGenerationSession {
    const messageRows = this.db
      .prepare('SELECT * FROM of_generation_messages WHERE session_id = ? ORDER BY created_at ASC')
      .all(row.id) as GenerationMessageRow[]
    const checkpointRows = this.db
      .prepare(
        'SELECT * FROM of_generation_checkpoints WHERE session_id = ? ORDER BY created_at ASC'
      )
      .all(row.id) as GenerationCheckpointRow[]
    const opLogRows = this.db
      .prepare('SELECT * FROM of_generation_oplog WHERE session_id = ? ORDER BY created_at ASC')
      .all(row.id) as GenerationOpLogRow[]

    const session = normalizeOFGenerationSession({
      id: row.id,
      workflow_name: row.workflow_name,
      description: row.description || undefined,
      prompt: row.prompt,
      status: row.status,
      current_phase: row.current_phase,
      schema_version: row.schema_version,
      compiled_workflow_id: row.compiled_workflow_id || undefined,
      phase_state: parseJson(row.phase_state_json),
      phase_models: parseJson(row.phase_models_json),
      agent_configs: parseJson(row.agent_configs_json),
      graph_state: parseJson(row.graph_state_json),
      preview: parseJson(row.preview_json),
      validation: parseJson(row.validation_json),
      artifacts: parseJson(row.artifacts_json),
      created_at: row.created_at,
      updated_at: row.updated_at
    })

    session.checkpoints = checkpointRows.map((item) => ({
      id: item.id,
      session_id: item.session_id,
      phase: item.phase,
      label: item.label,
      op_index: item.op_index,
      created_at: item.created_at
    }))

    session.op_log = opLogRows.map((item) => ({
      id: item.id,
      session_id: item.session_id,
      phase: item.phase,
      kind: item.kind,
      summary: item.summary,
      created_at: item.created_at
    }))

    for (const thread of Object.values(session.agent_threads)) {
      thread.messages = []
    }

    for (const item of messageRows) {
      const thread = session.agent_threads[item.agent_id]
      if (!thread) {
        log.warn('Unknown generation agent thread found in sqlite row', { agentId: item.agent_id })
        continue
      }
      thread.messages.push({
        id: item.id,
        agent_id: item.agent_id,
        role: item.role,
        content: item.content,
        created_at: item.created_at,
        status: item.status || undefined,
        meta: item.meta_json ? parseJson(item.meta_json) : undefined
      })
      thread.updated_at = item.created_at
    }

    return session
  }
}
