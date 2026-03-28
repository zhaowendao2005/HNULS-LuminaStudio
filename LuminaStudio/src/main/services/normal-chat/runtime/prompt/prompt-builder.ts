import type {
  NormalChatAssistant,
  NormalChatConversationPromptMessage,
  NormalChatConversationTurnRequestRecord,
  NormalChatConversationTurnResponseRecord,
  NormalChatTopic
} from '@preload/types'

// PromptBuilder 负责构建每轮请求需要的 prompt、request record 以及 resolved config，便于 runtime 层重用。
export class NormalChatPromptBuilder {
  // 这个方法封装了 system prompt 的继承/override 逻辑，结果会写进 turn trace 及 snapshot。
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

  // buildResolvedConfig 提取静态执行配置并写入 task snapshot，方便后续调度/审计。
  buildResolvedConfig(input: {
    assistant: NormalChatAssistant
    topic: NormalChatTopic
    providerId: string
    modelId: string
  }): Record<string, unknown> {
    return {
      assistantId: input.assistant.id,
      topicId: input.topic.id,
      providerId: input.providerId,
      modelId: input.modelId,
      streamingEnabled: input.assistant.streamingEnabled,
      contextMemoryRounds: input.assistant.contextMemoryRounds,
      maxRecursionDepth: input.assistant.maxRecursionDepth,
      maxReasoningSteps: input.assistant.maxReasoningSteps
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
