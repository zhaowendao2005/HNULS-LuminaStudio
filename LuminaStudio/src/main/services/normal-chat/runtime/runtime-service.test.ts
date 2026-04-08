import { describe, expect, it, vi } from 'vitest'
import { NormalChatRuntimeService } from './runtime-service'

describe('NormalChatRuntimeService', () => {
  it('stores a slimmed request snapshot and sets light persistence preset', async () => {
    const requestHeadsRepository = {
      create: vi.fn(),
      updateStatus: vi.fn(),
      listByTopicId: vi.fn(() => [])
    }
    const requestEntriesRepository = {
      append: vi.fn(() => 1),
      listByTopicId: vi.fn(() => [])
    }
    const taskScheduler = {
      registerPendingTask: vi.fn()
    }
    const queueExecutor = {
      enqueue: vi.fn()
    }
    const streamPublisher = {
      setPersistencePreset: vi.fn(),
      appendAgentRunCreated: vi.fn()
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
      requestHeadsRepository as any,
      requestEntriesRepository as any,
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

    expect(requestEntriesRepository.append).toHaveBeenCalledTimes(2)
    const appendCalls = requestEntriesRepository.append.mock.calls as unknown as Array<
      [{ payloadJson: string; requestId: string }]
    >
    const firstRequestEntry = appendCalls[0]?.[0] as
      | { payloadJson: string; requestId: string }
      | undefined
    expect(firstRequestEntry).toBeDefined()
    const requestPayload = JSON.parse(firstRequestEntry!.payloadJson)
    expect(requestPayload.request.input).toBe('')
    expect(requestPayload.runtime.systemPrompt).toBe('')
    expect(requestPayload.historyMessages).toEqual([])
    expect(requestPayload.promptInjections).toEqual([])
    expect(requestPayload.actions).toEqual([])
    expect(requestPayload.persistencePreset).toBe('light')
    expect(streamPublisher.setPersistencePreset).toHaveBeenCalledWith(
      firstRequestEntry!.requestId,
      'light'
    )
  })
})
