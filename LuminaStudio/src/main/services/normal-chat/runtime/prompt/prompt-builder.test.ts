import { describe, expect, it } from 'vitest'
import { NormalChatPromptBuilder } from './prompt-builder'

const assistant = {
  id: 'assistant-1',
  name: 'Default Assistant',
  emoji: '🤖',
  labelId: null,
  defaultSystemPrompt: 'assistant prompt',
  streamingEnabled: true,
  callMode: 'auto' as const,
  costMode: 'per_token' as const,
  defaultModelProviderId: 'provider-openai',
  defaultModelId: 'gpt-4o-mini',
  contextMemoryRounds: 12,
  maxRecursionDepth: 2,
  maxReasoningSteps: 6,
  systemActionFunctionCallEnabled: true,
  systemActionSubAgentEnabled: true,
  functionCallPubMedEnabled: true,
  functionCallPubMedMode: 'fast' as const,
  mcpEnabled: false,
  sortOrder: 0
}

describe('NormalChatPromptBuilder', () => {
  it('uses the topic override prompt when present', () => {
    const builder = new NormalChatPromptBuilder()
    const requestRecord = builder.buildRequestRecord({
      assistant,
      topic: {
        id: 'topic-1',
        assistantId: 'assistant-1',
        title: 'topic',
        systemPromptMode: 'override',
        systemPromptOverride: 'topic prompt',
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
      },
      providerId: 'provider-openai',
      modelId: 'gpt-4o-mini',
      input: 'hello'
    })

    expect(requestRecord.effectiveSystemPrompt).toBe('topic prompt')
    expect(requestRecord.promptMessages).toEqual([
      { role: 'system', content: 'topic prompt' },
      { role: 'user', content: 'hello' }
    ])
  })
})
