import { randomUUID } from 'crypto'
import type {
  NormalChatAssistant,
  NormalChatConversationMessage,
  NormalChatSendMessageRequest,
  NormalChatTopic
} from '@preload/types'
import type { NormalChatRepository } from '../normal-chat.repository'
import type {
  NormalChatLlmClient,
  NormalChatResolvedProviderTarget
} from '../llm-client/normal-chat-llm-client'

export interface NormalChatAssembledConversationRequest {
  requestId: string
  input: string
  assistant: NormalChatAssistant
  topic: NormalChatTopic
  provider: NormalChatResolvedProviderTarget
  effectiveSystemPrompt: string
  userMessage: NormalChatConversationMessage
}

function resolveEffectiveSystemPrompt(
  assistant: NormalChatAssistant,
  topic: NormalChatTopic
): string {
  if (topic.systemPromptMode === 'override') {
    return topic.systemPromptOverride ?? ''
  }

  return assistant.defaultSystemPrompt
}

/**
 * 把 renderer 发来的“执行意图”装配成 main 侧真正可执行的请求上下文。
 * 这里重新推导 assistant / topic / effectiveSystemPrompt，避免前端越权拼装执行参数。
 */
export class NormalChatRequestAssembler {
  constructor(
    private readonly repository: NormalChatRepository,
    private readonly llmClient: NormalChatLlmClient
  ) {}

  async assembleSendMessage(
    payload: NormalChatSendMessageRequest,
    signal: AbortSignal
  ): Promise<NormalChatAssembledConversationRequest> {
    const topic = this.requireTopic(payload.topicId)
    const assistant = this.requireAssistant(topic.assistantId)
    const input = payload.input.trim()

    if (!input) {
      throw new Error('Message is empty')
    }

    const provider = await this.llmClient.resolveChatTarget(
      payload.providerId,
      payload.modelId,
      signal
    )
    const requestId = randomUUID()
    const now = new Date().toISOString()
    const userMessage: NormalChatConversationMessage = {
      id: randomUUID(),
      topicId: topic.id,
      requestId,
      role: 'user',
      parts: [{ kind: 'text', text: input }],
      createdAt: now,
      updatedAt: now
    }

    return {
      requestId,
      input,
      assistant,
      topic,
      provider,
      effectiveSystemPrompt: resolveEffectiveSystemPrompt(assistant, topic),
      userMessage
    }
  }

  private requireAssistant(assistantId: string): NormalChatAssistant {
    const assistant = this.repository.getAssistantById(assistantId)
    if (!assistant) {
      throw new Error(`助手不存在: ${assistantId}`)
    }

    return assistant
  }

  private requireTopic(topicId: string): NormalChatTopic {
    const topic = this.repository.getTopicById(topicId)
    if (!topic) {
      throw new Error(`话题不存在: ${topicId}`)
    }

    return topic
  }
}
