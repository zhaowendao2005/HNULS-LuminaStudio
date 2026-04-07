import type { NormalChatConversationMessage, NormalChatTaskExecutionSnapshot } from '@preload/types'
import type { NormalChatActionResultRecord } from '../../actions/shared/action-result-projection'
import type { NormalChatResolvedAction } from '../../actions/shared/action.types'
import type {
  NormalChatActionFeedback,
  NormalChatAssistantRoundArtifact,
  NormalChatAssistantTurnKind
} from '../memory/assistant-round-memory.types'

export interface NormalChatRepairAttempt {
  kind:
    | 'output_contract_error'
    | 'schema_error'
    | 'validation_error'
    | 'permission_denied'
    | 'provider_error'
    | 'prompt_budget'
  message: string
  retryCount: number
  roundIndex: number
}

export interface NormalChatPromptRuntimeBudget {
  promptBudgetChars: number
  roundMemoryWindow: number
  maxRepairAttempts: number
  maxProviderRetries: number
}

export interface NormalChatRoundState {
  executionSnapshot: NormalChatTaskExecutionSnapshot
  seedHistoryMessages: NormalChatConversationMessage[]
  resolvedActions: NormalChatResolvedAction[]
  roundIndex: number
  loadedActionKeys: Set<string>
  actionResults: NormalChatActionResultRecord[]
  actionFeedback: NormalChatActionFeedback[]
  assistantArtifacts: NormalChatAssistantRoundArtifact[]
  repairAttempts: NormalChatRepairAttempt[]
  finalReply: string
  currentModelCallId: string | null
  shouldContinue: boolean
  hasActionsToExecute: boolean
  reachedReactLimit: boolean
  runtimeBudget: NormalChatPromptRuntimeBudget
  // 这里只统计真正执行过 action 的轮次，不把 action 之后必须保留的一轮总结算进去。
  actionRoundsUsed: number
  // 只要本轮刚执行过 action，就必须再进一轮消费结果，直到产出 synthesis/final answer 才能清空。
  postActionSynthesisPending: boolean
  // 记录最近一批已执行 action 的 runId，供下一轮 prompt 和 model-call trace 明确“正在消费哪批结果”。
  lastExecutedActionRunIds: string[]
  // 记住最近一轮 assistant 的语义类型，便于 UI、持久化和后续调试判断当前停在计划轮还是总结轮。
  lastTurnKind: NormalChatAssistantTurnKind | null
}

export interface NormalChatRoundStateCreateInput {
  executionSnapshot: NormalChatTaskExecutionSnapshot
  seedHistoryMessages: NormalChatConversationMessage[]
  resolvedActions: NormalChatResolvedAction[]
}
