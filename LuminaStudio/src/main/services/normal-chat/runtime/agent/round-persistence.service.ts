import type { NormalChatConversationMessage } from '@preload/types'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'
import type { NormalChatPromptBundle } from '../llm/model-adapter.interface'
import { NormalChatModelCallsRepository } from '../../repositories/model-calls.repository'
import { nowIso } from '../../shared/utils'

export class NormalChatRoundPersistenceService {
  constructor(private readonly modelCallsRepository: NormalChatModelCallsRepository) {}

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
    promptBundle: NormalChatPromptBundle
    historyMessages: NormalChatConversationMessage[]
    loadedActions: NormalChatResolvedAction[]
    actionResults: NormalChatActionResultRecord[]
  }): string {
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
      compiledPromptJson: JSON.stringify(input.promptBundle.sections),
      compiledPromptMarkdown: input.promptBundle.promptDocument,
      historyMessagesJson: JSON.stringify(input.historyMessages),
      loadedActionsJson: JSON.stringify(input.loadedActions),
      actionResultsJson: JSON.stringify(input.actionResults),
      timestamp: nowIso()
    })
  }

  markModelCallRunning(modelCallId: string): void {
    this.modelCallsRepository.markRunning(modelCallId, nowIso())
  }

  appendModelCallStream(modelCallId: string, streamText: string): void {
    this.modelCallsRepository.appendStreamText(modelCallId, streamText, nowIso())
  }

  completeModelCall(
    modelCallId: string,
    responseEnvelope: Record<string, unknown>,
    finalReplyMd: string,
    responseStreamText: string
  ): void {
    this.modelCallsRepository.markSucceeded(
      modelCallId,
      JSON.stringify(responseEnvelope),
      finalReplyMd,
      responseStreamText,
      nowIso()
    )
  }

  failModelCall(modelCallId: string, errorMessage: string, responseStreamText: string): void {
    this.modelCallsRepository.markFailed(modelCallId, errorMessage, responseStreamText, nowIso())
  }
}
