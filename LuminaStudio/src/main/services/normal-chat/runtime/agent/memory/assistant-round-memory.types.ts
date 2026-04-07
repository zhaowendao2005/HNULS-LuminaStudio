/**
 * 助手轮次记忆类型定义
 *
 * 定义 Agent 每一轮对话的记忆数据结构，包括：
 * - 动作反馈（ActionFeedback）：动作执行失败时的错误信息和修复提示
 * - 轮次工件（RoundArtifact）：一轮对话的完整记忆快照
 * - 批次执行结果（ExecutionBatchResult）：一批动作执行后的聚合结果
 * - 输出工件输入（OutputArtifactInput）：创建工件所需的输入
 */
import type { NormalChatActionCall } from '../../actions/shared/action.types'
import type { NormalChatActionResultRecord } from '../../actions/shared/action-result-projection'

/**
 * 动作反馈
 *
 * 动作执行失败时生成的反馈信息，用于注入到后续 prompt 中，
 * 帮助 LLM 了解错误原因并修正输入。
 */
export interface NormalChatActionFeedback {
  /** 动作标识键 */
  actionKey: string
  /** 动作显示标题 */
  title: string
  /** 错误状态 */
  status:
    | 'schema_error'
    | 'validation_error'
    | 'permission_denied'
    | 'execution_error'
    | 'unknown_action'
  /** 是否可重试 */
  retryable: boolean
  /** 错误消息 */
  message: string
  /** 修复提示（由服务端生成，指导 LLM 如何修正） */
  fixHint: string | null
  /** 所在轮次索引 */
  roundIndex: number
}

/**
 * 助手轮次工件
 *
 * 一轮对话的完整记忆快照，包含助手的回复、计划的动作、执行结果和子 Agent 摘要。
 * 工件会被注入到后续轮次的 prompt 中，让 LLM 了解之前的对话内容。
 */
export interface NormalChatAssistantRoundArtifact {
  /** 轮次索引 */
  roundIndex: number
  /** 助手回复正文（Markdown 格式，截断到 400 字符） */
  bodyMd: string
  /** 计划执行的动作列表（仅包含动作键和输入预览） */
  plannedActions: Array<{
    /** 动作标识键 */
    actionKey: string
    /** 输入参数预览（截断到 160 字符的 JSON） */
    inputPreview: string
  }>
  /** 动作执行结果摘要（Markdown 格式，由批次结果拼接） */
  resultSummaryMd: string
  /** 紧凑摘要（用于旧轮次的单行摘要） */
  compactSummaryMd: string
  /** 子 Agent 摘要（Markdown 格式，无子 Agent 时为 null） */
  childSummariesMd: string | null
}

/**
 * 动作执行批次结果
 *
 * 一批动作执行后的聚合结果，包含所有动作的结果记录、反馈和子 Agent 摘要。
 */
export interface NormalChatActionExecutionBatchResult {
  /** 该批次内所有动作的结果记录列表 */
  results: NormalChatActionResultRecord[]
  /** 该批次内所有动作的反馈列表（仅包含失败的动作） */
  feedback: NormalChatActionFeedback[]
  /** 该批次内所有子 Agent 的摘要列表 */
  childSummaries: Array<{
    /** 子 Agent 运行 ID */
    childAgentRunId: string
    /** 子 Agent 执行结果摘要 */
    summaryMarkdown: string
  }>
}

/**
 * 助手输出工件输入
 *
 * 从助手输出创建轮次工件所需的输入参数。
 */
export interface NormalChatAssistantOutputArtifactInput {
  /** 轮次索引 */
  roundIndex: number
  /** 助手回复正文 */
  bodyMd: string
  /** 助手计划执行的动作调用列表 */
  actionCalls: NormalChatActionCall[]
}
