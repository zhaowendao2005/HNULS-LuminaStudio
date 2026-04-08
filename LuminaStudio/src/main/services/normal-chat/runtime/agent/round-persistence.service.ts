import { randomUUID } from 'node:crypto'
import type { NormalChatConversationMessage } from '@preload/types'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'
import type {
  NormalChatPromptBundleV2,
  NormalChatPromptTrimSnapshot
} from '../prompt/prompt-bundle.types'
import { NormalChatStreamPublisher } from '../streaming/stream-publisher'

const EPHEMERAL_MODEL_CALL_ID_PREFIX = 'ephemeral-model-call:'

function isEphemeralModelCallId(modelCallId: string): boolean {
  return modelCallId.startsWith(EPHEMERAL_MODEL_CALL_ID_PREFIX)
}

export class NormalChatRoundPersistenceService {
  constructor(private readonly streamPublisher: NormalChatStreamPublisher) {}

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
    const modelCallId = input.persist
      ? randomUUID()
      : `${EPHEMERAL_MODEL_CALL_ID_PREFIX}${randomUUID()}`

    this.streamPublisher.appendModelCallCreated({
      requestId: input.requestId,
      modelCallId,
      agentRunId: input.agentRunId,
      parentActionRunId: input.parentActionRunId,
      turnKind: input.turnKind,
      producedActionCount: input.producedActionCount,
      consumedActionRunIds: input.consumedActionRunIds,
      synthesisRequired: input.synthesisRequired,
      depth: input.depth,
      roundIndex: input.roundIndex,
      callIndexInAgent: input.callIndexInAgent,
      requestPayload: input.requestPayload,
      prompt: {
        systemSections: input.promptBundle.systemSections as unknown as Record<string, unknown>,
        roundSections: input.promptBundle.roundSections as unknown as Record<string, unknown>,
        compiledSystemPrompt: input.promptBundle.compiledSystemPrompt,
        compiledRoundPrompt: input.promptBundle.compiledRoundPrompt,
        promptDocument: input.promptBundle.promptDocument,
        trimSnapshot: (input.trimSnapshot ?? null) as unknown as Record<string, unknown> | null
      },
      historyMessages: input.historyMessages,
      loadedActions: input.loadedActions,
      actionResults: input.actionResults,
      persist: input.persist
    })

    return modelCallId
  }

  markModelCallRunning(_modelCallId: string): void {
    void _modelCallId
  }

  appendModelCallStream(_modelCallId: string, _streamText: string): void {
    void _modelCallId
    void _streamText
  }

  completeModelCall(
    modelCallId: string,
    responseEnvelope: Record<string, unknown>,
    finalReplyMd: string,
    responseStreamText: string,
    metadata: {
      requestId: string
      turnKind: 'answer' | 'action_plan' | 'post_action_synthesis'
      producedActionCount: number
      consumedActionRunIds: string[]
      synthesisRequired: boolean
    }
  ): void {
    this.streamPublisher.appendModelCallFinished({
      requestId: metadata.requestId,
      modelCallId,
      responseEnvelope,
      finalReplyMd,
      responseStreamText,
      turnKind: metadata.turnKind,
      producedActionCount: metadata.producedActionCount,
      consumedActionRunIds: metadata.consumedActionRunIds,
      synthesisRequired: metadata.synthesisRequired
    })
  }

  failModelCall(
    requestId: string,
    modelCallId: string,
    errorMessage: string,
    responseStreamText: string
  ): void {
    if (isEphemeralModelCallId(modelCallId)) {
      return
    }

    this.streamPublisher.appendModelCallFailed({
      requestId,
      modelCallId,
      errorMessage,
      responseStreamText
    })
  }
}
