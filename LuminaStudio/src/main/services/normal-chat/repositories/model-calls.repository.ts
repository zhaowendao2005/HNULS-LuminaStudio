import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { NormalChatModelCallSnapshot, NormalChatPromptSnapshot } from '@preload/types'
import type { ModelCallRow } from '../shared/rows'
import { parseJson } from '../shared/utils'

export class NormalChatModelCallsRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    taskId: string
    requestId: string
    conversationId: string
    agentRunId: string
    parentActionRunId: string | null
    depth: number
    roundIndex: number
    callIndexInAgent: number
    requestPayloadJson: string
    compiledPromptJson: string
    compiledPromptMarkdown: string
    historyMessagesJson: string
    loadedActionsJson: string
    actionResultsJson: string
    timestamp: string
  }): string {
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO normal_chat_model_calls
         (id, task_id, request_id, conversation_id, agent_run_id, parent_action_run_id, depth, round_index, call_index_in_agent,
          status, request_payload_json, compiled_prompt_json, compiled_prompt_markdown, history_messages_json,
          loaded_actions_json, action_results_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.taskId,
        input.requestId,
        input.conversationId,
        input.agentRunId,
        input.parentActionRunId,
        input.depth,
        input.roundIndex,
        input.callIndexInAgent,
        input.requestPayloadJson,
        input.compiledPromptJson,
        input.compiledPromptMarkdown,
        input.historyMessagesJson,
        input.loadedActionsJson,
        input.actionResultsJson,
        input.timestamp,
        input.timestamp
      )

    return id
  }

  markRunning(modelCallId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET status = 'running', started_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, timestamp, modelCallId)
  }

  appendStreamText(modelCallId: string, nextText: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET response_stream_text = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(nextText, timestamp, modelCallId)
  }

  markSucceeded(
    modelCallId: string,
    responseEnvelopeJson: string,
    finalReplyMd: string,
    responseStreamText: string,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET status = 'succeeded',
             response_envelope_json = ?,
             final_reply_md = ?,
             response_stream_text = ?,
             finished_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(
        responseEnvelopeJson,
        finalReplyMd,
        responseStreamText,
        timestamp,
        timestamp,
        modelCallId
      )
  }

  markFailed(
    modelCallId: string,
    errorMessage: string,
    responseStreamText: string,
    timestamp: string
  ): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET status = 'failed',
             error_message = ?,
             response_stream_text = ?,
             finished_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(errorMessage, responseStreamText, timestamp, timestamp, modelCallId)
  }

  markAbortedByTask(taskId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET status = 'aborted', finished_at = ?, updated_at = ?
         WHERE task_id = ? AND status IN ('queued', 'running')`
      )
      .run(timestamp, timestamp, taskId)
  }

  markInterruptedCallsFailed(timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET status = 'failed', error_message = ?, finished_at = ?, updated_at = ?
         WHERE status = 'running'`
      )
      .run('Model call interrupted by application restart.', timestamp, timestamp)
  }

  listByRequest(requestId: string): NormalChatModelCallSnapshot[] {
    return (
      this.db
        .prepare('SELECT * FROM normal_chat_model_calls WHERE request_id = ? ORDER BY seq')
        .all(requestId) as ModelCallRow[]
    ).map((row) => ({
      id: row.id,
      seq: row.seq,
      taskId: row.task_id,
      requestId: row.request_id,
      conversationId: row.conversation_id,
      agentRunId: row.agent_run_id,
      parentActionRunId: row.parent_action_run_id,
      depth: row.depth,
      roundIndex: row.round_index,
      callIndexInAgent: row.call_index_in_agent,
      status: row.status,
      requestPayloadJson: row.request_payload_json,
      compiledPromptJson: parseJson(row.compiled_prompt_json, {
        context: '',
        actionDescriptions: '',
        loadedActionSpecs: '',
        actionResults: '',
        outputContract: ''
      } satisfies NormalChatPromptSnapshot),
      compiledPromptMarkdown: row.compiled_prompt_markdown,
      historyMessagesJson: row.history_messages_json,
      loadedActionsJson: row.loaded_actions_json,
      actionResultsJson: row.action_results_json,
      responseStreamText: row.response_stream_text,
      responseEnvelopeJson: row.response_envelope_json,
      finalReplyMd: row.final_reply_md,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      updatedAt: row.updated_at
    }))
  }
}
