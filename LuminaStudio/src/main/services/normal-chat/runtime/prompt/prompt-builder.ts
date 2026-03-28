import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatConversationPromptMessage,
  NormalChatConversationTurnRequestRecord,
  NormalChatConversationTurnResponseRecord,
  NormalChatTopic
} from '@preload/types'
import type { NormalChatActionResultRecord } from '../actions/shared/action-result-projection'
import type { NormalChatResolvedAction } from '../actions/shared/action.types'
import type { NormalChatPromptBundle } from '../llm/model-adapter.interface'
import { buildActionDescriptionsSection } from './sections/action-descriptions-section'
import { buildActionResultsSection } from './sections/action-results-section'
import { buildContextSection } from './sections/context-section'
import { buildLoadedActionSpecsSection } from './sections/loaded-action-specs-section'
import { buildOutputContractSection } from './sections/output-contract-section'

export class NormalChatPromptBuilder {
  buildRequestRecord(input: {
    assistant: NormalChatAssistant
    topic: NormalChatTopic
    providerId: string
    modelId: string
    input: string
  }): NormalChatConversationTurnRequestRecord {
    const promptMessages: NormalChatConversationPromptMessage[] = [
      {
        role: 'system',
        content:
          input.topic.systemPromptMode === 'override'
            ? (input.topic.systemPromptOverride ?? '')
            : input.assistant.defaultSystemPrompt
      },
      {
        role: 'user',
        content: input.input
      }
    ]

    return {
      assistant: {
        id: input.assistant.id,
        name: input.assistant.name,
        emoji: input.assistant.emoji,
        defaultSystemPrompt: input.assistant.defaultSystemPrompt,
        streamingEnabled: input.assistant.streamingEnabled,
        callMode: input.assistant.callMode,
        costMode: input.assistant.costMode,
        defaultModelProviderId: input.assistant.defaultModelProviderId,
        defaultModelId: input.assistant.defaultModelId,
        contextMemoryRounds: input.assistant.contextMemoryRounds,
        maxRecursionDepth: input.assistant.maxRecursionDepth,
        maxReasoningSteps: input.assistant.maxReasoningSteps
      },
      topic: {
        id: input.topic.id,
        title: input.topic.title,
        systemPromptMode: input.topic.systemPromptMode,
        systemPromptOverride: input.topic.systemPromptOverride
      },
      providerId: input.providerId,
      modelId: input.modelId,
      streamingEnabled: input.assistant.streamingEnabled,
      input: input.input,
      effectiveSystemPrompt: promptMessages[0].content,
      promptMessages
    }
  }

  buildResolvedConfig(input: {
    assistant: NormalChatAssistant
    topic: NormalChatTopic
    conversationId: string
    providerId: string
    modelId: string
  }): Record<string, unknown> {
    return {
      assistantId: input.assistant.id,
      topicId: input.topic.id,
      conversationId: input.conversationId,
      providerId: input.providerId,
      modelId: input.modelId,
      streamingEnabled: input.assistant.streamingEnabled,
      contextMemoryRounds: input.assistant.contextMemoryRounds,
      maxRecursionDepth: input.assistant.maxRecursionDepth,
      maxReasoningSteps: input.assistant.maxReasoningSteps
    }
  }

  buildRoundPromptBundle(input: {
    conversationTitle: string
    systemPrompt: string
    historyMessages: NormalChatConversationMessage[]
    userInput: string
    agentGoal: string
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

    const sections = {
      context: buildContextSection({
        systemPrompt: input.systemPrompt,
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

  createInitialResponseRecord(): NormalChatConversationTurnResponseRecord {
    return {
      chunks: [],
      finalText: '',
      aborted: false,
      errorMessage: null,
      completedAt: null
    }
  }
}
