import { describe, expect, it, vi } from 'vitest'
import { createNormalChatAgentSuite, getDefaultNormalChatAssistantProfile } from './index'

function createLogger(): Pick<Console, 'debug' | 'info' | 'warn' | 'error'> {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}

describe('normal-chat agent registry', () => {
  it('exposes the default assistant profile', () => {
    expect(getDefaultNormalChatAssistantProfile().name).toBe('基础助手')
    expect(getDefaultNormalChatAssistantProfile().defaultSystemPrompt).toContain('通用中文助手')
  })

  it('creates the default graph suite without template metadata', () => {
    const suite = createNormalChatAgentSuite()
    expect(suite).toBeTruthy()

    const graph = suite.createGraph({
      services: {
        getConversationMessages() {
          return []
        },
        getProviderProtocol: async () => 'openai-completion',
        createChatModel: async () => ({
          invoke: async () => ({
            content: JSON.stringify({
              phase: 'synthesize',
              plannerNotes: 'mock',
              statusText: null,
              actions: [
                {
                  kind: 'final-answer',
                  actionId: 'final-1',
                  answerHint: 'mock'
                }
              ],
              stopReason: null
            })
          }),
          stream: async () =>
            ({
              async *[Symbol.asyncIterator]() {
                yield 'mock'
              }
            }) as AsyncIterable<unknown>
        }),
        functioncallRegistry: {
          listHelpers: () => [],
          getHelper: () => null,
          requireHelper: () => {
            throw new Error('unused')
          }
        },
        logger: createLogger()
      }
    })

    expect(graph).toHaveProperty('run')
    expect(graph).toHaveProperty('buildAnswerMessages')
  })
})
