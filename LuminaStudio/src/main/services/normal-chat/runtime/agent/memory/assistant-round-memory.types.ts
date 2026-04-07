import type { NormalChatActionCall } from '../../actions/shared/action.types'
import type { NormalChatActionResultRecord } from '../../actions/shared/action-result-projection'

// answer: 直接对用户可见的回答轮。
// action_plan: 模型本轮产出了 action call，正文通常只是计划/解释，不能当成最终答案。
// post_action_synthesis: action 已执行完，当前轮必须先消费结果并把它们整理成对用户可见的总结。
export type NormalChatAssistantTurnKind = 'answer' | 'action_plan' | 'post_action_synthesis'

export interface NormalChatActionFeedback {
  actionKey: string
  title: string
  status:
    | 'schema_error'
    | 'validation_error'
    | 'permission_denied'
    | 'execution_error'
    | 'unknown_action'
  retryable: boolean
  message: string
  fixHint: string | null
  roundIndex: number
}

export interface NormalChatAssistantRoundArtifact {
  roundIndex: number
  turnKind: NormalChatAssistantTurnKind
  bodyMd: string
  // action_plan 轮单独保存计划正文，避免后续 memory/panel 把它误当成“本轮最终回答”。
  planBodyMd: string | null
  // 非 action_plan 轮才会写入 answerBodyMd，表示这一轮文本已经可以直接面向用户展示。
  answerBodyMd: string | null
  plannedActions: Array<{
    actionKey: string
    inputPreview: string
  }>
  resultSummaryMd: string
  compactSummaryMd: string
  childSummariesMd: string | null
  // 记录本 artifact 已经合并过哪些 action run，便于 prompt、trace 和调试定位结果来源。
  executedActionRunIds: string[]
}

export interface NormalChatActionExecutionBatchResult {
  results: NormalChatActionResultRecord[]
  feedback: NormalChatActionFeedback[]
  childSummaries: Array<{
    childAgentRunId: string
    summaryMarkdown: string
  }>
  executedActionRunIds: string[]
}

export interface NormalChatAssistantOutputArtifactInput {
  roundIndex: number
  turnKind: NormalChatAssistantTurnKind
  bodyMd: string
  actionCalls: NormalChatActionCall[]
}
