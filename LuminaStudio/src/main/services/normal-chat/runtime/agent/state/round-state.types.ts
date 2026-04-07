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
  actionRoundsUsed: number
  postActionSynthesisPending: boolean
  lastExecutedActionRunIds: string[]
  lastTurnKind: NormalChatAssistantTurnKind | null
}

export interface NormalChatRoundStateCreateInput {
  executionSnapshot: NormalChatTaskExecutionSnapshot
  seedHistoryMessages: NormalChatConversationMessage[]
  resolvedActions: NormalChatResolvedAction[]
}
