import type Database from 'better-sqlite3'

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
  }): void {
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
  }

  markRunning(taskId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_agent_runs
         SET status = 'running', started_at = ?, updated_at = ?
         WHERE task_id = ? AND depth = 0`
      )
      .run(timestamp, timestamp, taskId)
  }

  markCompleted(taskId: string, finalText: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_agent_runs
         SET status = 'completed', react_count = 1, final_text = ?, finished_at = ?, updated_at = ?
         WHERE task_id = ? AND depth = 0`
      )
      .run(finalText, timestamp, timestamp, taskId)
  }

  markAborted(taskId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_agent_runs
         SET status = 'aborted', finished_at = ?, updated_at = ?
         WHERE task_id = ? AND depth = 0`
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
}
