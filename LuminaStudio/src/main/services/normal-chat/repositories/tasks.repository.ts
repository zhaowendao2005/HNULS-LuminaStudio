import type Database from 'better-sqlite3'

// tasks 表示“一轮请求”的主状态机；task_snapshots 则保存当时解析出的配置和请求快照。
export class NormalChatTasksRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    taskId: string
    requestId: string
    topicId: string
    assistantId: string
    userMessageId: string
    rootAgentRunId: string
    providerId: string
    modelId: string
    timestamp: string
  }): void {
    this.db
      .prepare(
        `INSERT INTO normal_chat_tasks
         (id, request_id, conversation_id, topic_id, assistant_id, user_message_id,
          root_agent_run_id, status, model_provider_id, model_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)`
      )
      .run(
        input.taskId,
        input.requestId,
        input.taskId,
        input.topicId,
        input.assistantId,
        input.userMessageId,
        input.rootAgentRunId,
        input.providerId,
        input.modelId,
        input.timestamp,
        input.timestamp
      )
  }

  createSnapshot(input: {
    // snapshot 是运行前快照，后续即使 assistant/topic 配置被改动，也不影响历史追溯。
    taskId: string
    requestId: string
    topicId: string
    assistantId: string
    userInput: string
    resolvedConfig: Record<string, unknown>
    requestPayload: unknown
    timestamp: string
  }): void {
    this.db
      .prepare(
        `INSERT INTO normal_chat_task_snapshots
         (task_id, request_id, conversation_id, topic_id, assistant_id, agent_template_id,
          user_input, resolved_config_json, history_messages_json, prompt_injections_json,
          request_payload_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.taskId,
        input.requestId,
        input.taskId,
        input.topicId,
        input.assistantId,
        'main-agent-v1',
        input.userInput,
        JSON.stringify(input.resolvedConfig),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify(input.requestPayload),
        input.timestamp,
        input.timestamp
      )
  }

  getTaskIdByRequest(requestId: string): string | null {
    const row = this.db
      .prepare('SELECT id FROM normal_chat_tasks WHERE request_id = ?')
      .get(requestId) as { id: string } | undefined

    return row?.id ?? null
  }

  markRunning(taskId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET status = 'running', started_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, timestamp, taskId)
  }

  markCompleted(taskId: string, assistantMessageId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET status = 'completed', assistant_message_id = ?, finished_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(assistantMessageId, timestamp, timestamp, taskId)
  }

  markAborted(taskId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET status = 'aborted', finished_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, timestamp, taskId)
  }

  markInterruptedTasksFailed(timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET status = 'failed', error_message = ?, finished_at = ?, updated_at = ?
         WHERE status = 'running'`
      )
      .run('Task interrupted by application restart.', timestamp, timestamp)
  }

  delete(taskId: string): void {
    this.db.prepare('DELETE FROM normal_chat_tasks WHERE id = ?').run(taskId)
  }
}
