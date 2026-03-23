import { describe, expect, it, vi } from 'vitest'
import type { PaperRetrievalService } from '../../../paper-retrieval'
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
      runtime: {
        getConversationMessages() {
          return []
        },
        createChatModel: async () => ({
          withStructuredOutput() {
            return {
              invoke: async () => ({
                mode: 'answer',
                reason: 'mock'
              })
            }
          }
        }),
        logger: createLogger()
      },
      trace: {
        record: vi.fn(),
        snapshot: vi.fn(() => []),
        subscribe: vi.fn(() => () => undefined)
      },
      hostDependencies: {
        paperRetrievalService: {
          search: vi.fn()
        } as unknown as PaperRetrievalService
      }
    })

    expect(graph).toHaveProperty('run')
  })
})
