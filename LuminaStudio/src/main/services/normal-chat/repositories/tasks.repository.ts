import type Database from 'better-sqlite3'
import type {
  NormalChatTaskExecutionSnapshot,
  NormalChatTaskFinalResponse,
  NormalChatTaskPhase,
  NormalChatTaskStatus
} from '@preload/types'
import type { TaskRow } from '../shared/rows'
import { parseJson } from '../shared/utils'

export interface NormalChatTaskRootRecord {
  taskId: string
  requestId: string
  conversationId: string
  topicId: string
  assistantId: string
  assistantMessageId: string | null
  rootAgentRunId: string | null
  status: NormalChatTaskStatus
  phase: NormalChatTaskPhase
  modelProviderId: string
  modelId: string
  executionSnapshot: NormalChatTaskExecutionSnapshot
  finalResponse: NormalChatTaskFinalResponse | null
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export class NormalChatTasksRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    taskId: string
    requestId: string
    conversationId: string
    topicId: string
    assistantId: string
    userMessageId: string
    rootAgentRunId: string
    modelProviderId: string
    modelId: string
    executionSnapshot: NormalChatTaskExecutionSnapshot
    timestamp: string
  }): void {
    this.db
      .prepare(
        `INSERT INTO normal_chat_tasks
         (id, request_id, conversation_id, topic_id, assistant_id, user_message_id,
          root_agent_run_id, status, phase, model_provider_id, model_id, execution_snapshot_json,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 'queued', ?, ?, ?, ?, ?)`
      )
      .run(
        input.taskId,
        input.requestId,
        input.conversationId,
        input.topicId,
        input.assistantId,
        input.userMessageId,
        input.rootAgentRunId,
        input.modelProviderId,
        input.modelId,
        JSON.stringify(input.executionSnapshot),
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

  getByRequest(requestId: string): NormalChatTaskRootRecord | null {
    const row = this.db
      .prepare('SELECT * FROM normal_chat_tasks WHERE request_id = ?')
      .get(requestId) as TaskRow | undefined

    return row ? this.mapRow(row) : null
  }

  markRunning(taskId: string, phase: NormalChatTaskPhase, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET status = 'running', phase = ?, started_at = COALESCE(started_at, ?), updated_at = ?
         WHERE id = ?`
      )
      .run(phase, timestamp, timestamp, taskId)
  }

  markPhase(taskId: string, phase: NormalChatTaskPhase, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET phase = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(phase, timestamp, taskId)
  }

  markSucceeded(
    taskId: string,
    assistantMessageId: string,
    finalResponse: NormalChatTaskFinalResponse,
    lastEventSeq: number | null,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET status = 'succeeded',
             phase = 'finished',
             assistant_message_id = ?,
             final_response_json = ?,
             last_event_seq = ?,
             finished_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(
        assistantMessageId,
        JSON.stringify(finalResponse),
        lastEventSeq,
        timestamp,
        timestamp,
        taskId
      )
  }

  markAborted(
    taskId: string,
    finalResponse: NormalChatTaskFinalResponse,
    lastEventSeq: number | null,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET status = 'aborted',
             phase = 'finished',
             final_response_json = ?,
             last_event_seq = ?,
             finished_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(JSON.stringify(finalResponse), lastEventSeq, timestamp, timestamp, taskId)
  }

  markFailed(
    taskId: string,
    errorMessage: string,
    finalResponse: NormalChatTaskFinalResponse,
    lastEventSeq: number | null,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET status = 'failed',
             phase = 'finished',
             error_message = ?,
             final_response_json = ?,
             last_event_seq = ?,
             finished_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(errorMessage, JSON.stringify(finalResponse), lastEventSeq, timestamp, timestamp, taskId)
  }

  markInterruptedTasksFailed(timestamp: string): void {
    const finalResponse = JSON.stringify({
      chunks: [],
      finalText: '',
      aborted: false,
      errorMessage: 'Task interrupted by application restart.',
      completedAt: timestamp,
      assistantMessageId: null
    } satisfies NormalChatTaskFinalResponse)

    this.db
      .prepare(
        `UPDATE normal_chat_tasks
         SET status = 'failed',
             phase = 'finished',
             error_message = ?,
             final_response_json = ?,
             finished_at = ?,
             updated_at = ?
         WHERE status = 'running'`
      )
      .run('Task interrupted by application restart.', finalResponse, timestamp, timestamp)
  }

  delete(taskId: string): void {
    this.db.prepare('DELETE FROM normal_chat_tasks WHERE id = ?').run(taskId)
  }

  private mapRow(row: TaskRow): NormalChatTaskRootRecord {
    return {
      taskId: row.id,
      requestId: row.request_id,
      conversationId: row.conversation_id,
      topicId: row.topic_id,
      assistantId: row.assistant_id,
      assistantMessageId: row.assistant_message_id,
      rootAgentRunId: row.root_agent_run_id,
      status: row.status,
      phase: row.phase,
      modelProviderId: row.model_provider_id,
      modelId: row.model_id,
      executionSnapshot: parseJson(row.execution_snapshot_json, null as never),
      finalResponse: parseJson(row.final_response_json, null as NormalChatTaskFinalResponse | null),
      errorMessage: row.error_message,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at
    }
  }
}
