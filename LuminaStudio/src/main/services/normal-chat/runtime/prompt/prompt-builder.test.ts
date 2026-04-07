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
      roundMemoryWindow: 3,
      postActionSynthesisPending: false
    })

    expect(bundle.compiledSystemPrompt).toContain('base-system')
    expect(bundle.compiledSystemPrompt).toContain('injection-a')
    expect(bundle.compiledSystemPrompt).toContain('injection-b')
    expect(bundle.compiledRoundPrompt).toContain('## Context')
  })

  it('prioritizes latest action turn results before prior round memory', () => {
    const builder = new NormalChatPromptBuilder()
    const bundle = builder.buildRoundPromptBundle({
      conversationTitle: 'Topic',
      systemPrompt: 'base-system',
      historyMessages: [],
      userInput: 'question',
      agentGoal: 'goal',
      promptInjections: [],
      resolvedActions: [],
      loadedActions: [],
      actionResults: [],
      actionFeedback: [],
      assistantArtifacts: [
        {
          roundIndex: 1,
          turnKind: 'action_plan',
          bodyMd: 'I will wait',
          planBodyMd: 'I will wait',
          answerBodyMd: null,
          plannedActions: [],
          resultSummaryMd: '### Result',
          compactSummaryMd: '',
          childSummariesMd: 'child summary',
          executedActionRunIds: ['a1']
        }
      ],
      roundMemoryWindow: 3,
      postActionSynthesisPending: true
    })

    expect(bundle.compiledRoundPrompt.indexOf('## LatestActionTurnResults')).toBeGreaterThan(-1)
    expect(bundle.compiledRoundPrompt.indexOf('## LatestActionTurnResults')).toBeLessThan(
      bundle.compiledRoundPrompt.indexOf('## PriorRoundMemory')
    )
  })
})
