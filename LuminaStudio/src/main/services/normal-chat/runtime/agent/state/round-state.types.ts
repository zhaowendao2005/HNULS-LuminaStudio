/**
 * 轮次状态类型定义
 *
 * 定义 Agent ReAct 循环中每一轮的执行状态数据结构。
 *
 * 核心类型：
 * - NormalChatRoundState：完整的轮次状态（所有执行数据）
 * - NormalChatRepairAttempt：修复尝试记录
 * - NormalChatPromptRuntimeBudget：Prompt 运行时预算配置
 * - NormalChatRoundStateCreateInput：状态创建输入
 */
import type { NormalChatConversationMessage, NormalChatTaskExecutionSnapshot } from '@preload/types'
import type { NormalChatActionResultRecord } from '../../actions/shared/action-result-projection'
import type { NormalChatResolvedAction } from '../../actions/shared/action.types'
import type {
  NormalChatActionFeedback,
  NormalChatAssistantRoundArtifact
} from '../memory/assistant-round-memory.types'

/**
 * 修复尝试记录
 *
 * 记录一次 LLM 输出或动作执行失败的修复尝试。
 * 用于恢复策略判断是否超过最大修复次数。
 */
export interface NormalChatRepairAttempt {
  /** 错误类型 */
  kind:
    | 'output_contract_error'  // LLM 输出格式不合法
    | 'schema_error'           // Zod Schema 校验失败
    | 'validation_error'       // 业务验证失败
    | 'permission_denied'      // 权限检查拒绝
    | 'provider_error'         // LLM 提供商错误
    | 'prompt_budget'          // Prompt 超出预算
  /** 错误消息 */
  message: string
  /** 该类型错误的历史重试次数 */
  retryCount: number
  /** 发生的轮次索引 */
  roundIndex: number
}

/**
 * Prompt 运行时预算配置
 *
 * 控制 Prompt 构建和 Agent 执行的资源限制。
 */
export interface NormalChatPromptRuntimeBudget {
  /** Prompt 字符数上限（默认 28000） */
  promptBudgetChars: number
  /** 轮次记忆窗口大小（保留最近 N 轮的完整记忆，默认 3） */
  roundMemoryWindow: number
  /** 每轮最大修复尝试次数（默认 2） */
  maxRepairAttempts: number
  /** LLM 提供商最大重试次数（默认 2） */
  maxProviderRetries: number
}

/**
 * 轮次状态
 *
 * Agent ReAct 循环中每一轮的完整执行状态。
 * 由 NormalChatRoundStateFactory 创建，在整个 ReAct 循环中持续更新。
 */
export interface NormalChatRoundState {
  /** 任务执行快照（包含任务配置、对话信息、运行时参数等） */
  executionSnapshot: NormalChatTaskExecutionSnapshot
  /** 种子历史消息（从任务快照中传入的对话历史） */
  seedHistoryMessages: NormalChatConversationMessage[]
  /** 当前已解析的可用动作列表 */
  resolvedActions: NormalChatResolvedAction[]
  /** 当前轮次索引（从 0 开始，prepareRound 中递增） */
  roundIndex: number
  /** 已加载的动作键集合（通过 get_action_spec 动态加载的动作） */
  loadedActionKeys: Set<string>
  /** 累计的动作执行结果列表 */
  actionResults: NormalChatActionResultRecord[]
  /** 累计的动作反馈列表（包含错误信息和修复提示） */
  actionFeedback: NormalChatActionFeedback[]
  /** 助手轮次工件列表（每轮对话的记忆快照） */
  assistantArtifacts: NormalChatAssistantRoundArtifact[]
  /** 修复尝试记录列表 */
  repairAttempts: NormalChatRepairAttempt[]
  /** 最终回复文本（ReAct 循环结束后设置） */
  finalReply: string
  /** 当前模型调用 ID（用于持久化追踪） */
  currentModelCallId: string | null
  /** 是否应该继续执行下一轮 */
  shouldContinue: boolean
  /** 是否有待执行的动作（当前轮次 LLM 输出了 action 块） */
  hasActionsToExecute: boolean
  /** 是否已达到 ReAct 上限 */
  reachedReactLimit: boolean
  /** 运行时预算配置 */
  runtimeBudget: NormalChatPromptRuntimeBudget
}

/**
 * 轮次状态创建输入
 *
 * 创建初始轮次状态所需的最小输入参数。
 */
export interface NormalChatRoundStateCreateInput {
  /** 任务执行快照 */
  executionSnapshot: NormalChatTaskExecutionSnapshot
  /** 种子历史消息 */
  seedHistoryMessages: NormalChatConversationMessage[]
  /** 已解析的可用动作列表 */
  resolvedActions: NormalChatResolvedAction[]
}
