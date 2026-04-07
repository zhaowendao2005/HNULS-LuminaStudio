import { describe, expect, it } from 'vitest'
import { NormalChatPromptBuilder } from './prompt-builder'

describe('NormalChatPromptBuilder', () => {
  it('injects promptInjections into the compiled system prompt', () => {
    const builder = new NormalChatPromptBuilder()

    const bundle = builder.buildRoundPromptBundle({
      conversationTitle: 'Topic',
      systemPrompt: 'base-system',
      historyMessages: [],
      userInput: 'question',
      agentGoal: 'goal',
      promptInjections: ['injection-a', 'injection-b'],
      resolvedActions: [],
      loadedActions: [],
      actionResults: [],
      actionFeedback: [],
      assistantArtifacts: [],
      roundMemoryWindow: 3
    })

    expect(bundle.compiledSystemPrompt).toContain('base-system')
    expect(bundle.compiledSystemPrompt).toContain('injection-a')
    expect(bundle.compiledSystemPrompt).toContain('injection-b')
    expect(bundle.compiledRoundPrompt).toContain('## Context')
  })
})
