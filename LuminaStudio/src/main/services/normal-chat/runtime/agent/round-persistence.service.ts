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

const EPHEMERAL_MODEL_CALL_ID_PREFIX = 'ephemeral-model-call:'

function isEphemeralModelCallId(modelCallId: string): boolean {
  return modelCallId.startsWith(EPHEMERAL_MODEL_CALL_ID_PREFIX)
}

export class NormalChatRoundPersistenceService {
  constructor(private readonly modelCallsRepository: NormalChatModelCallsRepository) {}

  createQueuedModelCall(input: {
    taskId: string
    requestId: string
    conversationId: string
    agentRunId: string
    parentActionRunId: string | null
    turnKind: 'answer' | 'action_plan' | 'post_action_synthesis'
    producedActionCount: number
    consumedActionRunIds: string[]
    synthesisRequired: boolean
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
      turnKind: input.turnKind,
      producedActionCount: input.producedActionCount,
      consumedActionRunIdsJson: JSON.stringify(input.consumedActionRunIds),
      synthesisRequired: input.synthesisRequired,
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

  markModelCallRunning(modelCallId: string): void {
    if (isEphemeralModelCallId(modelCallId)) {
      return
    }
    this.modelCallsRepository.markRunning(modelCallId, nowIso())
  }

  appendModelCallStream(modelCallId: string, streamText: string): void {
    if (isEphemeralModelCallId(modelCallId)) {
      return
    }
    this.modelCallsRepository.appendStreamText(modelCallId, streamText, nowIso())
  }

  completeModelCall(
    modelCallId: string,
    responseEnvelope: Record<string, unknown>,
    finalReplyMd: string,
    responseStreamText: string,
    metadata: {
      turnKind: 'answer' | 'action_plan' | 'post_action_synthesis'
      producedActionCount: number
      consumedActionRunIds: string[]
      synthesisRequired: boolean
    }
  ): void {
    if (isEphemeralModelCallId(modelCallId)) {
      return
    }
    this.modelCallsRepository.markSucceeded(
      modelCallId,
      JSON.stringify(responseEnvelope),
      finalReplyMd,
      responseStreamText,
      {
        turnKind: metadata.turnKind,
        producedActionCount: metadata.producedActionCount,
        consumedActionRunIdsJson: JSON.stringify(metadata.consumedActionRunIds),
        synthesisRequired: metadata.synthesisRequired
      },
      nowIso()
    )
  }

  failModelCall(modelCallId: string, errorMessage: string, responseStreamText: string): void {
    if (isEphemeralModelCallId(modelCallId)) {
      return
    }
    this.modelCallsRepository.markFailed(modelCallId, errorMessage, responseStreamText, nowIso())
  }
}
