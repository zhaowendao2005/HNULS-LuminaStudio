import { describe, expect, it, vi } from 'vitest'
import {
  createNormalChatAgentSuite,
  getNormalChatAgentTemplateDefinition,
  listNormalChatAgentTemplates
} from './index'

function createLogger(): Pick<Console, 'debug' | 'info' | 'warn' | 'error'> {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}

describe('normal-chat agent registry', () => {
  it('只暴露统一的 suite 入口', () => {
    const templates = listNormalChatAgentTemplates()
    expect(templates.map((template) => template.key)).toEqual(['base-agent'])
    expect(getNormalChatAgentTemplateDefinition('base-agent')?.defaultSystemPrompt).toContain(
      '通用中文助手'
    )
  })

  it('可以按 templateKey 创建图谱套件', () => {
    const suite = createNormalChatAgentSuite('base-agent')
    expect(suite).toBeTruthy()
    expect(suite?.template.key).toBe('base-agent')

    const graph = suite!.createGraph({
      services: {
        getConversationMessages() {
          return []
        },
        getProviderProtocol: async () => 'openai-completion',
        createChatModel: async () => ({
          invoke: async () => ({
            content: JSON.stringify({
              action: 'answer',
              reasoning: 'mock',
              helperId: null,
              helperArgs: null,
              childTask: null,
              finalAnswerHint: 'mock'
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
