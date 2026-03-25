import { describe, expect, it, vi } from 'vitest'
import type { NormalChatAssistant, NormalChatTopic } from '@preload/types'
import { NormalChatRequestAssembler } from './normal-chat-request-assembler'

function createAssistant(): NormalChatAssistant {
  return {
    id: 'assistant-1',
    templateKey: 'base-agent',
    name: '测试助手',
    emoji: 'A',
    labelId: null,
    defaultSystemPrompt: '默认系统提示词',
    saveFullConversationEnabled: false,
    streamingEnabled: true,
    callMode: 'auto',
    costMode: 'per_token',
    maxRecursionDepth: 2,
    maxRetriesPerAgent: 1,
    sortOrder: 0
  }
}

function createTopic(): NormalChatTopic {
  return {
    id: 'topic-1',
    assistantId: 'assistant-1',
    title: '测试话题',
    systemPromptMode: 'inherit',
    systemPromptOverride: null,
    streamingMode: 'inherit',
    streamingEnabledOverride: null,
    sortOrder: 0
  }
}

function createRepositoryMock(overrides?: {
  assistant?: NormalChatAssistant | null
  topic?: NormalChatTopic | null
}) {
  const assistant = overrides?.assistant ?? createAssistant()
  const topic = overrides?.topic ?? createTopic()

  return {
    getAssistantById: vi.fn().mockReturnValue(assistant),
    getTopicById: vi.fn().mockReturnValue(topic)
  }
}

describe('NormalChatRequestAssembler', () => {
  it('recomputes effective system prompt from assistant and topic state', async () => {
    const resolveChatTarget = vi.fn().mockResolvedValue({
      providerId: 'provider-openai',
      providerName: 'OpenAI Compatible',
      protocol: 'openai',
      baseUrl: 'https://example.com',
      apiKey: 'test-key',
      defaultHeaders: {},
      modelId: 'claude-3-5-sonnet'
    })
    const repository = createRepositoryMock()
    const assembler = new NormalChatRequestAssembler(
      repository as never,
      {
        resolveChatTarget
      } as never
    )

    const result = await assembler.assembleSendMessage(
      {
        topicId: 'topic-1',
        providerId: 'provider-openai',
        modelId: 'claude-3-5-sonnet',
        input: ' 你好 '
      },
      new AbortController().signal
    )

    expect(resolveChatTarget).toHaveBeenCalledWith(
      'provider-openai',
      'claude-3-5-sonnet',
      expect.any(AbortSignal)
    )
    expect(repository.getTopicById).toHaveBeenCalledWith('topic-1')
    expect(repository.getAssistantById).toHaveBeenCalledWith('assistant-1')
    expect(result.assistant.id).toBe('assistant-1')
    expect(result.topic.id).toBe('topic-1')
    expect(result.effectiveSystemPrompt).toBe('默认系统提示词')
    expect(result.userMessage.parts).toEqual([{ kind: 'text', text: '你好' }])
    expect(result.userMessage.requestId).toBe(result.requestId)
  })

  it('uses topic override prompt when the topic is in override mode', async () => {
    const repository = createRepositoryMock({
      topic: {
        ...createTopic(),
        systemPromptMode: 'override',
        systemPromptOverride: '只给当前话题使用的覆盖提示词'
      }
    })
    const assembler = new NormalChatRequestAssembler(
      repository as never,
      {
        resolveChatTarget: vi.fn().mockResolvedValue({
          providerId: 'provider-openai',
          providerName: 'OpenAI Compatible',
          protocol: 'openai',
          baseUrl: 'https://example.com',
          apiKey: 'test-key',
          defaultHeaders: {},
          modelId: 'gpt-4o-mini'
        })
      } as never
    )

    const result = await assembler.assembleSendMessage(
      {
        topicId: 'topic-1',
        providerId: 'provider-openai',
        modelId: 'gpt-4o-mini',
        input: 'hello'
      },
      new AbortController().signal
    )

    expect(result.effectiveSystemPrompt).toBe('只给当前话题使用的覆盖提示词')
  })
})
