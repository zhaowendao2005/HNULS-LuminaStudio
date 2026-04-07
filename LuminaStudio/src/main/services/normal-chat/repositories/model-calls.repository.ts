/**
 * 模型调用数据仓库
 *
 * 负责 normal_chat_model_calls 表的 CRUD 操作。
 * 每一轮 Agent 对话中的 LLM 调用都会在此表中创建一条记录。
 *
 * 数据表字段：
 * - id：记录 ID（UUID）
 * - task_id / request_id / conversation_id：关联的业务 ID
 * - agent_run_id / parent_action_run_id：关联的 Agent 运行记录
 * - depth：Agent 嵌套深度
 * - round_index / call_index_in_agent：轮次和调用索引
 * - status：调用状态（queued → running → succeeded / failed / aborted）
 * - request_payload_json：请求载荷（providerId、modelId 等）
 * - compiled_prompt_json：编译后的 Prompt（系统 Prompt + 轮次 Prompt + 截断快照）
 * - compiled_prompt_markdown：Prompt 的 Markdown 文本
 * - history_messages_json：历史消息
 * - loaded_actions_json：已加载动作
 * - action_results_json：动作执行结果
 * - response_stream_text：流式响应文本（逐步追加）
 * - response_envelope_json：响应信封（解析后的结构化输出）
 * - final_reply_md：最终回复 Markdown
 * - error_message：错误消息
 * - created_at / started_at / finished_at / updated_at：时间戳
 */
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { NormalChatModelCallSnapshot, NormalChatPromptSnapshot } from '@preload/types'
import type { ModelCallRow } from '../shared/rows'
import { parseJson } from '../shared/utils'

/**
 * 创建默认的 Prompt 快照
 *
 * 用于 JSON 解析失败时的兜底值，避免 null 导致的类型错误。
 */
function createDefaultPromptSnapshot(): NormalChatPromptSnapshot {
  return {
    systemSections: {
      identity: '',
      outputContract: '',
      actionProtocol: '',
      repairContract: ''
    },
    roundSections: {
      context: '',
      priorRoundMemory: '',
      actionDescriptions: '',
      loadedActionSpecs: '',
      actionResults: '',
      actionFeedback: ''
    },
    compiledSystemPrompt: '',
    compiledRoundPrompt: '',
    trimSnapshot: null
  }
}

/**
 * 模型调用数据仓库类
 *
 * 封装 normal_chat_model_calls 表的所有数据库操作。
 */
export class NormalChatModelCallsRepository {
  /**
   * @param db - SQLite 数据库实例（依赖注入）
   */
  constructor(private readonly db: Database.Database) {}

  /**
   * 创建一条模型调用记录
   *
   * @param input - 模型调用创建参数
   * @returns 新创建的记录 ID
   */
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

  /**
   * 标记模型调用为运行中
   *
   * @param modelCallId - 模型调用记录 ID
   * @param timestamp - 时间戳
   */
  markRunning(modelCallId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET status = 'running', started_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp, timestamp, modelCallId)
  }

  /**
   * 追加流式响应文本
   *
   * 每次收到新的文本片段时调用，覆盖更新 response_stream_text 字段。
   *
   * @param modelCallId - 模型调用记录 ID
   * @param nextText - 当前完整的流式文本（非增量）
   * @param timestamp - 时间戳
   */
  appendStreamText(modelCallId: string, nextText: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET response_stream_text = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(nextText, timestamp, modelCallId)
  }

  /**
   * 标记模型调用为成功
   *
   * @param modelCallId - 模型调用记录 ID
   * @param responseEnvelopeJson - 响应信封 JSON
   * @param finalReplyMd - 最终回复 Markdown
   * @param responseStreamText - 完整的流式响应文本
   * @param timestamp - 时间戳
   */
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

  /**
   * 标记模型调用为失败
   *
   * @param modelCallId - 模型调用记录 ID
   * @param errorMessage - 错误消息
   * @param responseStreamText - 已接收的部分流式响应文本
   * @param timestamp - 时间戳
   */
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

  /**
   * 将指定任务的所有待执行/运行中的模型调用标记为中止
   *
   * @param taskId - 任务 ID
   * @param timestamp - 时间戳
   */
  markAbortedByTask(taskId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET status = 'aborted', finished_at = ?, updated_at = ?
         WHERE task_id = ? AND status IN ('queued', 'running')`
      )
      .run(timestamp, timestamp, taskId)
  }

  /**
   * 将所有运行中的模型调用标记为失败
   *
   * 用于应用重启时清理中断的调用。
   *
   * @param timestamp - 时间戳
   */
  markInterruptedCallsFailed(timestamp: string): void {
    this.db
      .prepare(
        `UPDATE normal_chat_model_calls
         SET status = 'failed', error_message = ?, finished_at = ?, updated_at = ?
         WHERE status = 'running'`
      )
      .run('Model call interrupted by application restart.', timestamp, timestamp)
  }

  /**
   * 查询指定请求的所有模型调用记录
   *
   * @param requestId - 请求 ID
   * @returns 模型调用快照列表（按 seq 排序）
   */
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
      compiledPromptJson: parseJson(row.compiled_prompt_json, createDefaultPromptSnapshot()),
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
