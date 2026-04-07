/**
 * LLM 模型适配器接口
 *
 * 定义 Normal Chat Agent 与 LLM 提供商交互的统一接口。
 * 所有 LLM 提供商（OpenAI、Claude 等）都通过此接口暴露能力。
 *
 * 核心接口：
 * - NormalChatModelAdapter：模型适配器（invokeRound + 可选的 streamRound）
 * - NormalChatScriptRoundInput：单轮调用的输入参数
 * - NormalChatModelStreamEvent：流式输出事件类型
 */
import type { NormalChatTaskExecutionSnapshot } from '@preload/types'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'
import type { NormalChatPromptBundleV2 } from '../prompt/prompt-bundle.types'

/**
 * 模型流式输出事件
 *
 * 流式调用 LLM 时产生的事件联合类型：
 * - start：流开始
 * - first-token：首 token 到达（含延迟时间）
 * - text-delta：文本增量片段
 * - usage：Token 使用量统计
 * - done：流结束（包含完整文本）
 * - error：流错误
 */
export type NormalChatModelStreamEvent =
  | { type: 'start' }
  | { type: 'first-token'; latencyMs: number }
  | { type: 'text-delta'; delta: string }
  | { type: 'usage'; promptTokens?: number; completionTokens?: number; totalTokens?: number }
  | { type: 'done'; fullText: string }
  | { type: 'error'; message: string }

/**
 * 单轮模型调用输入参数
 *
 * 调用 LLM 进行一轮对话所需的完整上下文。
 */
export interface NormalChatScriptRoundInput {
  /** 请求唯一标识 */
  requestId: string
  /** 话题唯一标识 */
  topicId: string
  /** 任务唯一标识 */
  taskId: string
  /** 任务执行快照（包含对话配置、运行时参数等） */
  executionSnapshot: NormalChatTaskExecutionSnapshot
  /** 当前轮次索引 */
  roundIndex: number
  /** Agent 嵌套深度 */
  agentDepth: number
  /** 父 Agent 运行 ID（子 Agent 时非 null） */
  parentAgentRunId: string | null
  /** 编译后的 Prompt 包（系统 Prompt + 轮次 Prompt） */
  promptBundle: NormalChatPromptBundleV2
  /** 当前已启用的动作列表 */
  enabledActions: NormalChatResolvedAction[]
  /** 已动态加载的动作键列表 */
  loadedActionKeys: string[]
  /** 累计的动作执行结果列表 */
  actionResults: NormalChatActionResultRecord[]
}

/**
 * 模型适配器接口
 *
 * 定义与 LLM 交互的统一接口。
 * 所有 LLM 提供商（OpenAI Chat、OpenAI Response、Claude）都实现此接口。
 */
export interface NormalChatModelAdapter {
  /**
   * 非流式调用 LLM 进行一轮对话
   *
   * @param input - 单轮调用输入参数
   * @returns LLM 返回的完整文本响应
   */
  invokeRound(input: NormalChatScriptRoundInput): Promise<string>

  /**
   * 流式调用 LLM 进行一轮对话（可选）
   *
   * 使用 AsyncGenerator 逐步产出流式事件。
   * 如果提供商不支持流式调用，可以不实现此方法。
   *
   * @param input - 单轮调用输入参数
   * @returns 异步生成器，产出流式事件
   */
  streamRound?(
    input: NormalChatScriptRoundInput
  ): AsyncGenerator<NormalChatModelStreamEvent, string, void>
}
