import type { NormalChatConversationMessage } from '@preload/types'
import type {
  NormalChatActionFeedback,
  NormalChatAssistantRoundArtifact
} from '../agent/memory/assistant-round-memory.types'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import type { NormalChatPromptBundleV2 } from './prompt-bundle.types'
import { buildActionDescriptionsSection } from './sections/action-descriptions-section'
import { buildActionFeedbackSection } from './sections/action-feedback-section'
import { buildActionProtocolSection } from './sections/action-protocol-section'
import { buildActionResultsSection } from './sections/action-results-section'
import { buildContextSection } from './sections/context-section'
import { buildLatestActionTurnSection } from './sections/latest-action-turn-section'
import { buildLoadedActionSpecsSection } from './sections/loaded-action-specs-section'
import { buildOutputContractSection } from './sections/output-contract-section'
import { buildPriorRoundMemorySection } from './sections/prior-round-memory-section'
import { buildRepairNoticeSection } from './sections/repair-notice-section'

export class NormalChatPromptBuilder {
  buildRoundPromptBundle(input: {
    conversationTitle: string
    systemPrompt: string
    historyMessages: NormalChatConversationMessage[]
    userInput: string
    agentGoal: string
    promptInjections: string[]
    resolvedActions: NormalChatResolvedAction[]
    loadedActions: NormalChatResolvedAction[]
    actionResults: NormalChatActionResultRecord[]
    actionFeedback: NormalChatActionFeedback[]
    assistantArtifacts: NormalChatAssistantRoundArtifact[]
    roundMemoryWindow: number
    postActionSynthesisPending?: boolean
    repairNotice?: string | null
    thinkingDigest?: string | null
  }): NormalChatPromptBundleV2 {
    const historyMarkdown = input.historyMessages
      .map((message) => {
        const text = message.parts
          .map((part) => {
            if (part.kind === 'text') {
              return part.text
            }
            if (part.kind === 'thinking') {
              return `[thinking:${part.title}]`
            }
            return `[functioncall:${part.functionCallName}]`
          })
          .join('\n')
        return `${message.role}: ${text}`
      })
      .join('\n')

    const injections = input.promptInjections
      .map((value) => value.trim())
      .filter(Boolean)
      .join('\n\n')
    const identity = injections ? `${input.systemPrompt}\n\n${injections}` : input.systemPrompt
    const latestArtifact = input.assistantArtifacts.at(-1) ?? null

    const systemSections = {
      identity,
      outputContract: buildOutputContractSection(),
      actionProtocol: buildActionProtocolSection(),
      repairContract: buildRepairNoticeSection(input.repairNotice)
    }

    const roundSections = {
      context: buildContextSection({
        historyMarkdown,
        userInput: input.userInput,
        conversationTitle: input.conversationTitle,
        agentGoal: input.agentGoal
      }),
      latestActionTurnResults: buildLatestActionTurnSection({
        latestArtifact,
        synthesisRequired: Boolean(input.postActionSynthesisPending)
      }),
      priorRoundMemory: buildPriorRoundMemorySection({
        artifacts: input.assistantArtifacts,
        roundMemoryWindow: input.roundMemoryWindow
      }),
      actionDescriptions: buildActionDescriptionsSection(input.resolvedActions),
      loadedActionSpecs: buildLoadedActionSpecsSection(input.loadedActions),
      actionResults: buildActionResultsSection(input.actionResults),
      actionFeedback: buildActionFeedbackSection(input.actionFeedback),
      thinkingDigest: input.thinkingDigest?.trim() || undefined,
      repairNotice: input.repairNotice?.trim() || undefined
    }

    const compiledSystemPrompt = Object.values(systemSections).filter(Boolean).join('\n\n---\n\n')
    const compiledRoundPrompt = Object.values(roundSections).filter(Boolean).join('\n\n---\n\n')

    return {
      systemSections,
      roundSections,
      compiledSystemPrompt,
      compiledRoundPrompt,
      promptDocument: [compiledSystemPrompt, compiledRoundPrompt]
        .filter(Boolean)
        .join('\n\n---\n\n')
    }
  }
}
