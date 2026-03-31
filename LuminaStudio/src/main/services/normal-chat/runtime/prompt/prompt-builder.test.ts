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
      actionResults: []
    })

    expect(bundle.promptDocument).toContain('base-system')
    expect(bundle.promptDocument).toContain('injection-a')
    expect(bundle.promptDocument).toContain('injection-b')
  })
})
