/**
 * 轮次持久化服务
 *
 * 负责将每一轮 Agent 对话的模型调用信息持久化到数据库。
 * 通过 NormalChatModelCallsRepository 操作 model_calls 表。
 *
 * 持久化的内容包括：
 * - 请求载荷（providerId、modelId、streamingEnabled 等）
 * - 编译后的 Prompt（系统 Prompt + 轮次 Prompt + 截断快照）
 * - 历史消息、已加载动作、动作执行结果
 * - 模型响应流文本（流式输出时逐步追加）
 * - 最终回复和响应信封
 *
 * 生命周期：
 * createQueuedModelCall → markModelCallRunning → appendModelCallStream（可选）
 * → completeModelCall / failModelCall
 */
import { randomUUID } from 'node:crypto'
import type { NormalChatConversationMessage } from '@preload/types'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'
import type {
  NormalChatPromptBundleV2,
  NormalChatPromptTrimSnapshot
} from '../prompt/prompt-bundle.types'
import { NormalChatModelCallsRepository } from '../../repositories/model-calls.repository'
import { nowIso } from '../../shared/utils'

/**
 * 轮次持久化服务类
 *
 * 封装模型调用的数据库持久化操作。
 */
const EPHEMERAL_MODEL_CALL_ID_PREFIX = 'ephemeral-model-call:'

function isEphemeralModelCallId(modelCallId: string): boolean {
  return modelCallId.startsWith(EPHEMERAL_MODEL_CALL_ID_PREFIX)
}

export class NormalChatRoundPersistenceService {
  /**
   * @param modelCallsRepository - 模型调用数据仓库（依赖注入）
   */
  constructor(private readonly modelCallsRepository: NormalChatModelCallsRepository) {}

  /**
   * 创建一条待执行的模型调用记录
   *
   * 在每轮 Prompt 构建完成后、调用 LLM 之前调用。
   * 将完整的 Prompt 信息和上下文持久化到数据库。
   *
   * @param input - 模型调用创建参数
   * @returns 新创建的模型调用记录 ID
   */
  createQueuedModelCall(input: {
    taskId: string
    requestId: string
    conversationId: string
    agentRunId: string
    parentActionRunId: string | null
    depth: number
    roundIndex: number
    callIndexInAgent: number
    requestPayload: Record<string, unknown>
    promptBundle: NormalChatPromptBundleV2
    trimSnapshot?: NormalChatPromptTrimSnapshot | null
    historyMessages: NormalChatConversationMessage[]
    loadedActions: NormalChatResolvedAction[]
    actionResults: NormalChatActionResultRecord[]
    persist: boolean
  }): string {
    if (!input.persist) {
      return `${EPHEMERAL_MODEL_CALL_ID_PREFIX}${randomUUID()}`
    }

    return this.modelCallsRepository.create({
      taskId: input.taskId,
      requestId: input.requestId,
      conversationId: input.conversationId,
      agentRunId: input.agentRunId,
      parentActionRunId: input.parentActionRunId,
      depth: input.depth,
      roundIndex: input.roundIndex,
      callIndexInAgent: input.callIndexInAgent,
      requestPayloadJson: JSON.stringify(input.requestPayload),
      compiledPromptJson: JSON.stringify({
        systemSections: input.promptBundle.systemSections,
        roundSections: input.promptBundle.roundSections,
        compiledSystemPrompt: input.promptBundle.compiledSystemPrompt,
        compiledRoundPrompt: input.promptBundle.compiledRoundPrompt,
        trimSnapshot: input.trimSnapshot ?? null
      }),
      compiledPromptMarkdown: input.promptBundle.promptDocument,
      historyMessagesJson: JSON.stringify(input.historyMessages),
      loadedActionsJson: JSON.stringify(input.loadedActions),
      actionResultsJson: JSON.stringify(input.actionResults),
      timestamp: nowIso()
    })
  }

  /**
   * 标记模型调用为运行中
   *
   * 在开始调用 LLM 之前调用，更新记录状态。
   *
   * @param modelCallId - 模型调用记录 ID
   */
  markModelCallRunning(modelCallId: string): void {
    if (isEphemeralModelCallId(modelCallId)) {
      return
    }
    this.modelCallsRepository.markRunning(modelCallId, nowIso())
  }

  /**
   * 追加流式输出文本
   *
   * 在流式输出模式下，每次收到新的文本片段时调用，
   * 将文本追加到模型调用记录的流文本字段中。
   *
   * @param modelCallId - 模型调用记录 ID
   * @param streamText - 新收到的文本片段
   */
  appendModelCallStream(modelCallId: string, streamText: string): void {
    if (isEphemeralModelCallId(modelCallId)) {
      return
    }
    this.modelCallsRepository.appendStreamText(modelCallId, streamText, nowIso())
  }

  /**
   * 标记模型调用为成功完成
   *
   * 在 LLM 响应完全接收后调用，保存最终的响应信封和回复内容。
   *
   * @param modelCallId - 模型调用记录 ID
   * @param responseEnvelope - 响应信封（包含 body_md、action_calls、thinking_md 等）
   * @param finalReplyMd - 最终回复的 Markdown 文本
   * @param responseStreamText - 完整的响应流文本
   */
  completeModelCall(
    modelCallId: string,
    responseEnvelope: Record<string, unknown>,
    finalReplyMd: string,
    responseStreamText: string
  ): void {
    if (isEphemeralModelCallId(modelCallId)) {
      return
    }
    this.modelCallsRepository.markSucceeded(
      modelCallId,
      JSON.stringify(responseEnvelope),
      finalReplyMd,
      responseStreamText,
      nowIso()
    )
  }

  /**
   * 标记模型调用为失败
   *
   * 在 LLM 调用异常时调用，记录错误信息。
   *
   * @param modelCallId - 模型调用记录 ID
   * @param errorMessage - 错误消息
   * @param responseStreamText - 已接收的部分响应文本
   */
  failModelCall(modelCallId: string, errorMessage: string, responseStreamText: string): void {
    if (isEphemeralModelCallId(modelCallId)) {
      return
    }
    this.modelCallsRepository.markFailed(modelCallId, errorMessage, responseStreamText, nowIso())
  }
}
