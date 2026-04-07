import type { NormalChatActionCall } from '../../actions/shared/action.types'
import type { NormalChatActionResultRecord } from '../../actions/shared/action-result-projection'

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
  planBodyMd: string | null
  answerBodyMd: string | null
  plannedActions: Array<{
    actionKey: string
    inputPreview: string
  }>
  resultSummaryMd: string
  compactSummaryMd: string
  childSummariesMd: string | null
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
