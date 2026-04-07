import { describe, expect, it, vi } from 'vitest'
import { NormalChatRuntimeService } from './runtime-service'

describe('NormalChatRuntimeService', () => {
  it('stores a slimmed task snapshot and disables runtime event persistence for light assistants', async () => {
    const messagesRepository = {
      listByTopic: vi.fn(() => []),
      insert: vi.fn()
    }
    const tasksRepository = {
      create: vi.fn()
    }
    const agentRunsRepository = {
      createRoot: vi.fn(() => ({ id: 'root-agent-run' }))
    }
    const taskScheduler = {
      registerPendingTask: vi.fn()
    }
    const queueExecutor = {
      enqueue: vi.fn()
    }
    const streamPublisher = {
      setRuntimeEventPersistence: vi.fn()
    }

    const runtimeService = new NormalChatRuntimeService(
      {
        transaction: (callback: () => void) => () => callback()
      } as any,
      {
        ensureSeedData: vi.fn(),
        getTopicById: vi.fn(() => ({
          id: 'topic-1',
          assistantId: 'assistant-1',
          title: 'Topic',
          systemPromptMode: 'inherit',
          systemPromptOverride: null,
          streamingMode: 'inherit',
          streamingEnabledOverride: null,
          costMode: 'inherit',
          costModeOverride: null,
          modelMode: 'inherit',
          modelProviderIdOverride: null,
          modelIdOverride: null,
          contextMemoryRoundsMode: 'inherit',
          contextMemoryRoundsOverride: null,
          maxRecursionDepthMode: 'inherit',
          maxRecursionDepthOverride: null,
          maxReasoningStepsMode: 'inherit',
          maxReasoningStepsOverride: null,
          systemActionFunctionCallMode: 'inherit',
          systemActionFunctionCallEnabledOverride: null,
          systemActionSubAgentMode: 'inherit',
          systemActionSubAgentEnabledOverride: null,
          functionCallPubMedMode: 'inherit',
          functionCallPubMedEnabledOverride: null,
          functionCallPubMedExecutionMode: 'inherit',
          functionCallPubMedExecutionModeOverride: null,
          mcpMode: 'inherit',
          mcpEnabledOverride: null,
          sortOrder: 0
        })),
        getAssistantById: vi.fn(() => ({
          id: 'assistant-1',
          name: 'Assistant',
          emoji: 'A',
          labelId: null,
          defaultSystemPrompt: 'system prompt',
          streamingEnabled: true,
          callMode: 'auto',
          costMode: 'per_token',
          defaultModelProviderId: 'provider-openai',
          defaultModelId: 'gpt-test',
          contextMemoryRounds: 12,
          maxRecursionDepth: 2,
          maxReasoningSteps: 6,
          systemActionFunctionCallEnabled: true,
          systemActionSubAgentEnabled: true,
          functionCallPubMedEnabled: true,
          functionCallPubMedMode: 'fast',
          mcpEnabled: false,
          persistencePreset: 'light',
          sortOrder: 0
        }))
      } as any,
      {
        resolveOrCreateDefaultConversation: vi.fn(() => ({
          id: 'conversation-1',
          title: 'Conversation',
          agentTemplateId: 'main-agent-v1',
          programPromptInjections: ['inject-1']
        }))
      } as any,
      messagesRepository as any,
      tasksRepository as any,
      agentRunsRepository as any,
      taskScheduler as any,
      queueExecutor as any,
      {} as any,
      streamPublisher as any
    )

    await runtimeService.sendMessage({
      topicId: 'topic-1',
      providerId: 'provider-openai',
      modelId: 'gpt-test',
      input: 'hello world'
    })

    expect(messagesRepository.insert).toHaveBeenCalledTimes(1)
    expect(tasksRepository.create).toHaveBeenCalledTimes(1)
    const createPayload = tasksRepository.create.mock.calls[0][0]
    expect(createPayload.executionSnapshot.request.input).toBe('')
    expect(createPayload.executionSnapshot.runtime.systemPrompt).toBe('')
    expect(createPayload.executionSnapshot.historyMessages).toEqual([])
    expect(createPayload.executionSnapshot.promptInjections).toEqual([])
    expect(createPayload.executionSnapshot.actions).toEqual([])
    expect(createPayload.executionSnapshot.runtime.persistencePreset).toBe('light')
    expect(streamPublisher.setRuntimeEventPersistence).toHaveBeenCalledWith(
      createPayload.requestId,
      false
    )
  })
})
