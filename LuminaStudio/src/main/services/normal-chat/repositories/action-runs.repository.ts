import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { NormalChatActionRunSnapshot } from '@preload/types'
import type { ActionRunRow } from '../shared/rows'

export interface NormalChatActionRunRecord {
  id: string
  taskId: string
  agentRunId: string
  actionKey: string
  actionKind: string
  mode: string | null
  status: 'queued' | 'running' | 'success' | 'error' | 'aborted'
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  inputJson: string
  outputJson: string | null
  errorMessage: string | null
}

export class NormalChatActionRunsRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    taskId: string
    agentRunId: string
    actionKey: string
    actionKind: string
    mode: string | null
    roundIndex: number
    batchIndex: number
    parallelIndex: number
    inputJson: string
    timestamp: string
  }): NormalChatActionRunRecord {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO normal_chat_action_runs
         (id, task_id, agent_run_id, action_key, action_kind, mode, status, round_index, batch_index, parallel_index, input_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.taskId,
        input.agentRunId,
        input.actionKey,
        input.actionKind,
        input.mode,
        input.roundIndex,
        input.batchIndex,
        input.parallelIndex,
        input.inputJson,
        input.timestamp,
        input.timestamp
      )

    return {
      id,
      taskId: input.taskId,
      agentRunId: input.agentRunId,
      actionKey: input.actionKey,
      actionKind: input.actionKind,
      mode: input.mode,
      status: 'queued',
      roundIndex: input.roundIndex,
      batchIndex: input.batchIndex,
      parallelIndex: input.parallelIndex,
      inputJson: input.inputJson,
      outputJson: null,
      errorMessage: null
    }
  }

  markRunning(actionRunId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_action_runs
         SET status = 'running', started_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, timestamp, actionRunId)
  }

  markSuccess(actionRunId: string, outputJson: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_action_runs
         SET status = 'success', output_json = ?, finished_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(outputJson, timestamp, timestamp, actionRunId)
  }

  markError(actionRunId: string, errorMessage: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_action_runs
         SET status = 'error', error_message = ?, finished_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(errorMessage, timestamp, timestamp, actionRunId)
  }

  markAbortedByTask(taskId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_action_runs
         SET status = 'aborted', finished_at = ?, updated_at = ?
         WHERE task_id = ? AND status IN ('queued', 'running')`
      )
      .run(timestamp, timestamp, taskId)
  }

  markInterruptedActionsFailed(timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_action_runs
         SET status = 'error', error_message = ?, finished_at = ?, updated_at = ?
         WHERE status = 'running'`
      )
      .run('Action interrupted by application restart.', timestamp, timestamp)
  }

  listByAgentRunIds(agentRunIds: string[]): NormalChatActionRunSnapshot[] {
    if (agentRunIds.length === 0) {
      return []
    }

    const placeholders = agentRunIds.map(() => '?').join(', ')
    return (
      this.db
        .prepare(
          `SELECT * FROM normal_chat_action_runs
         WHERE agent_run_id IN (${placeholders})
         ORDER BY round_index, batch_index, parallel_index, created_at`
        )
        .all(...agentRunIds) as ActionRunRow[]
    ).map((row) => ({
      id: row.id,
      taskId: row.task_id,
      agentRunId: row.agent_run_id,
      actionKey: row.action_key,
      actionKind: row.action_kind,
      mode: row.mode,
      status: row.status,
      roundIndex: row.round_index,
      batchIndex: row.batch_index,
      parallelIndex: row.parallel_index,
      inputJson: row.input_json,
      outputJson: row.output_json,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      updatedAt: row.updated_at
    }))
  }

  listByTaskId(taskId: string): NormalChatActionRunSnapshot[] {
    return (
      this.db
        .prepare(
          `SELECT * FROM normal_chat_action_runs
         WHERE task_id = ?
         ORDER BY round_index, batch_index, parallel_index, created_at`
        )
        .all(taskId) as ActionRunRow[]
    ).map((row) => ({
      id: row.id,
      taskId: row.task_id,
      agentRunId: row.agent_run_id,
      actionKey: row.action_key,
      actionKind: row.action_kind,
      mode: row.mode,
      status: row.status,
      roundIndex: row.round_index,
      batchIndex: row.batch_index,
      parallelIndex: row.parallel_index,
      inputJson: row.input_json,
      outputJson: row.output_json,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      updatedAt: row.updated_at
    }))
  }
}
