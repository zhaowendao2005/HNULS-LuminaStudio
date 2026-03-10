/**
 * OrchestraFlow Workflow Service
 * 工作流服务 - 负责工作流文件与 SQLite 索引
 */
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import { logger } from '../logger'
import { databaseManager } from '@main/services/database-sqlite'
import type { OFWorkflow, OFWorkflowMeta } from '../../../Public/ShareTypes/Orchestraflow-types'
import { parseJsonc } from './orchestraflow-workflow-json'

const log = logger.scope('OrchestraflowWorkflowService')

interface WorkflowIndexRow {
  workflow_id: string
  name: string
  description: string | null
  author: string
  status: string
  node_count: number
  json_path: string
  created_at: number
  updated_at: number
}

function getWorkflowDir(): string {
  const dir = join(app.getPath('userData'), 'UserData', 'Orchestraflow')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getWorkflowPath(workflowId: string): string {
  return join(getWorkflowDir(), `${workflowId}.json`)
}

export class OrchestraflowWorkflowService {
  private readonly db: Database.Database

  constructor() {
    this.db = databaseManager.getDatabase('orchestraflow-runtime')
  }

  async list(params?: {
    keyword?: string
    page?: number
    pageSize?: number
  }): Promise<{ workflows: OFWorkflowMeta[]; total: number }> {
    const page = params?.page || 1
    const pageSize = params?.pageSize || 20
    const keyword = params?.keyword?.trim().toLowerCase() || null

    const countRow = keyword
      ? (this.db
          .prepare(
            `SELECT COUNT(*) as count FROM of_workflow_index WHERE lower(name) LIKE ? OR lower(ifnull(description, '')) LIKE ?`
          )
          .get(`%${keyword}%`, `%${keyword}%`) as { count: number })
      : (this.db.prepare('SELECT COUNT(*) as count FROM of_workflow_index').get() as {
          count: number
        })

    const rows = keyword
      ? (this.db
          .prepare(
            `
            SELECT * FROM of_workflow_index
            WHERE lower(name) LIKE ? OR lower(ifnull(description, '')) LIKE ?
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
          `
          )
          .all(
            `%${keyword}%`,
            `%${keyword}%`,
            pageSize,
            (page - 1) * pageSize
          ) as WorkflowIndexRow[])
      : (this.db
          .prepare('SELECT * FROM of_workflow_index ORDER BY updated_at DESC LIMIT ? OFFSET ?')
          .all(pageSize, (page - 1) * pageSize) as WorkflowIndexRow[])

    return {
      workflows: rows.map((row) => ({
        id: row.workflow_id,
        name: row.name,
        description: row.description || undefined,
        author: row.author,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: row.status as OFWorkflowMeta['status'],
        nodeCount: row.node_count
      })),
      total: countRow.count
    }
  }

  async get(workflowId: string): Promise<OFWorkflow | null> {
    const row = this.db
      .prepare('SELECT * FROM of_workflow_index WHERE workflow_id = ?')
      .get(workflowId) as WorkflowIndexRow | undefined
    if (!row) return null

    try {
      const content = readFileSync(row.json_path, 'utf-8')
      return parseJsonc<OFWorkflow>(content)
    } catch (e) {
      log.error(`Failed to read workflow file for indexed workflow: ${workflowId}`, e)
      return null
    }
  }

  async create(data: { name: string; description?: string; author?: string }): Promise<OFWorkflow> {
    const now = Math.floor(Date.now() / 1000)
    const workflowId = `wf_${randomUUID()}`
    const workflow: OFWorkflow = {
      id: workflowId,
      name: data.name,
      description: data.description,
      author: data.author || 'LuminaStudio',
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      graph: { nodes: [], edges: [] }
    }

    const jsonPath = getWorkflowPath(workflowId)
    writeFileSync(jsonPath, JSON.stringify(workflow, null, 2), 'utf-8')
    this.upsertIndex(workflow, jsonPath)

    log.info(`Workflow created: ${workflowId}`)
    return workflow
  }

  async update(workflowId: string, data: Partial<OFWorkflow>): Promise<OFWorkflow | null> {
    const existing = await this.get(workflowId)
    if (!existing) return null

    const updated: OFWorkflow = {
      ...existing,
      ...data,
      id: workflowId,
      updatedAt: Math.floor(Date.now() / 1000)
    }

    const row = this.db
      .prepare('SELECT * FROM of_workflow_index WHERE workflow_id = ?')
      .get(workflowId) as WorkflowIndexRow | undefined
    const jsonPath = row?.json_path || getWorkflowPath(workflowId)

    writeFileSync(jsonPath, JSON.stringify(updated, null, 2), 'utf-8')
    this.upsertIndex(updated, jsonPath)
    log.info(`Workflow updated: ${workflowId}`)
    return updated
  }

  async delete(workflowId: string): Promise<boolean> {
    const row = this.db
      .prepare('SELECT * FROM of_workflow_index WHERE workflow_id = ?')
      .get(workflowId) as WorkflowIndexRow | undefined
    if (!row) return false

    if (existsSync(row.json_path)) {
      unlinkSync(row.json_path)
    }
    this.db.prepare('DELETE FROM of_workflow_index WHERE workflow_id = ?').run(workflowId)
    log.info(`Workflow deleted: ${workflowId}`)
    return true
  }

  private upsertIndex(workflow: OFWorkflow, jsonPath: string): void {
    this.db
      .prepare(
        `
        INSERT OR REPLACE INTO of_workflow_index (
          workflow_id,
          name,
          description,
          author,
          status,
          node_count,
          json_path,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        workflow.id,
        workflow.name,
        workflow.description || null,
        workflow.author,
        workflow.status,
        workflow.graph?.nodes?.length || 0,
        jsonPath,
        workflow.createdAt,
        workflow.updatedAt
      )
  }
}
