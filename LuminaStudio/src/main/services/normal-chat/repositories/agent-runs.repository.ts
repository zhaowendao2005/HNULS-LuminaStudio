import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { NormalChatAgentRunSnapshot } from '@preload/types'
import type { AgentRunRow } from '../shared/rows'

export interface NormalChatAgentRunRecord {
  id: string
  taskId: string
  parentAgentRunId: string | null
  depth: number
  roleKind: string
  templateId: string
  goal: string
}

export class NormalChatAgentRunsRepository {
  constructor(private readonly db: Database.Database) {}

  createRoot(input: {
    rootAgentRunId: string
    taskId: string
    goal: string
    maxReactSteps: number
    maxChildDepth: number
    providerId: string
    modelId: string
    timestamp: string
  }): NormalChatAgentRunRecord {
    this.db
      .prepare(
        `INSERT INTO normal_chat_agent_runs
         (id, task_id, parent_agent_run_id, depth, role_kind, template_id, goal, status,
          react_count, max_react_steps, max_child_depth, model_provider_id, model_id,
          created_at, updated_at)
         VALUES (?, ?, NULL, 0, 'director', 'main-agent-v1', ?, 'queued', 0, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.rootAgentRunId,
        input.taskId,
        input.goal,
        input.maxReactSteps,
        input.maxChildDepth,
        input.providerId,
        input.modelId,
        input.timestamp,
        input.timestamp
      )

    return {
      id: input.rootAgentRunId,
      taskId: input.taskId,
      parentAgentRunId: null,
      depth: 0,
      roleKind: 'director',
      templateId: 'main-agent-v1',
      goal: input.goal
    }
  }

  createChild(input: {
    taskId: string
    parentAgentRunId: string
    depth: number
    roleKind: string
    templateId: string
    goal: string
    maxReactSteps: number
    maxChildDepth: number
    providerId: string
    modelId: string
    timestamp: string
  }): NormalChatAgentRunRecord {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO normal_chat_agent_runs
         (id, task_id, parent_agent_run_id, depth, role_kind, template_id, goal, status,
          react_count, max_react_steps, max_child_depth, model_provider_id, model_id,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.taskId,
        input.parentAgentRunId,
        input.depth,
        input.roleKind,
        input.templateId,
        input.goal,
        input.maxReactSteps,
        input.maxChildDepth,
        input.providerId,
        input.modelId,
        input.timestamp,
        input.timestamp
      )

    return {
      id,
      taskId: input.taskId,
      parentAgentRunId: input.parentAgentRunId,
      depth: input.depth,
      roleKind: input.roleKind,
      templateId: input.templateId,
      goal: input.goal
    }
  }

  markRunningById(agentRunId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_agent_runs
         SET status = 'running', started_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, timestamp, agentRunId)
  }

  markSucceededById(
    agentRunId: string,
    finalText: string,
    reactCount: number,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `UPDATE normal_chat_agent_runs
         SET status = 'succeeded', react_count = ?, final_text = ?, finished_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(reactCount, finalText, timestamp, timestamp, agentRunId)
  }

  markFailedById(
    agentRunId: string,
    errorMessage: string,
    reactCount: number,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `UPDATE normal_chat_agent_runs
         SET status = 'failed', react_count = ?, error_message = ?, finished_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(reactCount, errorMessage, timestamp, timestamp, agentRunId)
  }

  markAbortedByTask(taskId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_agent_runs
         SET status = 'aborted', finished_at = ?, updated_at = ?
         WHERE task_id = ? AND status IN ('queued', 'running')`
      )
      .run(timestamp, timestamp, taskId)
  }

  markInterruptedRunsFailed(timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_agent_runs
         SET status = 'failed', error_message = ?, finished_at = ?, updated_at = ?
         WHERE status = 'running'`
      )
      .run('Agent interrupted by application restart.', timestamp, timestamp)
  }

  listByTaskId(taskId: string): NormalChatAgentRunSnapshot[] {
    return (
      this.db
        .prepare(
          `SELECT * FROM normal_chat_agent_runs
           WHERE task_id = ?
           ORDER BY depth, created_at`
        )
        .all(taskId) as AgentRunRow[]
    ).map((row) => ({
      id: row.id,
      taskId: row.task_id,
      parentAgentRunId: row.parent_agent_run_id,
      depth: row.depth,
      roleKind: row.role_kind,
      templateId: row.template_id,
      goal: row.goal,
      status: row.status,
      reactCount: row.react_count,
      maxReactSteps: row.max_react_steps,
      maxChildDepth: row.max_child_depth,
      modelProviderId: row.model_provider_id,
      modelId: row.model_id,
      finalText: row.final_text,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      updatedAt: row.updated_at
    }))
  }
}
