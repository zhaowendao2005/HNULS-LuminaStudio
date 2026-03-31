import type { NormalChatConversationMessage } from '@preload/types'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'
import type { NormalChatPromptBundle } from '../llm/model-adapter.interface'
import { buildActionDescriptionsSection } from './sections/action-descriptions-section'
import { buildActionResultsSection } from './sections/action-results-section'
import { buildContextSection } from './sections/context-section'
import { buildLoadedActionSpecsSection } from './sections/loaded-action-specs-section'
import { buildOutputContractSection } from './sections/output-contract-section'

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
  }): NormalChatPromptBundle {
    const historyMarkdown = input.historyMessages
      .map((message) => {
        const text = message.parts
          .map((part) =>
            part.kind === 'text' ? part.text : `[functioncall:${part.functionCallName}]`
          )
          .join('\n')
        return `${message.role}: ${text}`
      })
      .join('\n')

    const injections = input.promptInjections
      .map((value) => value.trim())
      .filter(Boolean)
      .join('\n\n')
    const systemPrompt = injections ? `${input.systemPrompt}\n\n${injections}` : input.systemPrompt

    const sections = {
      context: buildContextSection({
        systemPrompt,
        historyMarkdown,
        userInput: input.userInput,
        conversationTitle: input.conversationTitle,
        agentGoal: input.agentGoal
      }),
      actionDescriptions: buildActionDescriptionsSection(input.resolvedActions),
      loadedActionSpecs: buildLoadedActionSpecsSection(input.loadedActions),
      actionResults: buildActionResultsSection(input.actionResults),
      outputContract: buildOutputContractSection()
    }

    return {
      sections,
      promptDocument: Object.values(sections).join('\n\n---\n\n')
    }
  }
}
