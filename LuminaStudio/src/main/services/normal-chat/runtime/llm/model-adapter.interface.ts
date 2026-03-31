import type { NormalChatTaskExecutionSnapshot } from '@preload/types'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'

export interface NormalChatPromptBundle {
  sections: {
    context: string
    actionDescriptions: string
    loadedActionSpecs: string
    actionResults: string
    outputContract: string
  }
  promptDocument: string
}

export interface NormalChatScriptRoundInput {
  requestId: string
  topicId: string
  taskId: string
  executionSnapshot: NormalChatTaskExecutionSnapshot
  roundIndex: number
  agentDepth: number
  parentAgentRunId: string | null
  promptBundle: NormalChatPromptBundle
  enabledActions: NormalChatResolvedAction[]
  loadedActionKeys: string[]
  actionResults: NormalChatActionResultRecord[]
}

export interface NormalChatModelAdapter {
  invokeRound(input: NormalChatScriptRoundInput): Promise<string>
}
