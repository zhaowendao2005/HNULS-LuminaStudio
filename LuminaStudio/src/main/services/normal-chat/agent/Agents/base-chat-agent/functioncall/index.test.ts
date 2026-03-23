import { describe, expect, it, vi } from 'vitest'
import type { NormalChatAgentToolExecuteContext } from '../../../contracts'
import type { PaperRetrievalService } from '../../../../../paper-retrieval'
import { createBaseChatAgentFunctioncallSuite } from './index'

const mocks = vi.hoisted(() => ({
  executePubmedSearch: vi.fn()
}))

vi.mock('./pubmed-search/execute', () => ({
  executePubmedSearch: mocks.executePubmedSearch
}))

function createLogger(): Pick<Console, 'debug' | 'info' | 'warn' | 'error'> {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}

function createToolContext(): NormalChatAgentToolExecuteContext {
  return {
    signal: new AbortController().signal,
    logger: createLogger(),
    trace: {
      record: vi.fn(),
      snapshot: vi.fn(() => []),
      subscribe: vi.fn(() => () => undefined)
    },
    runContext: {
      requestId: 'request-1',
      topicId: 'topic-1',
      assistantId: 'assistant-1',
      providerId: 'provider-1',
      modelId: 'model-1',
      systemPrompt: 'system prompt',
      input: 'pubmed query',
      signal: new AbortController().signal
    },
    modelContext: {
      providerId: 'provider-1',
      modelId: 'model-1'
    }
  }
}

describe('base-chat-agent functioncall suite', () => {
  it('把 PubMed 执行封装到 agent-local facade 里', async () => {
    const paperRetrievalService = {
      search: vi.fn()
    } as unknown as PaperRetrievalService

    const suite = createBaseChatAgentFunctioncallSuite({
      paperRetrievalService
    })

    mocks.executePubmedSearch.mockResolvedValue({
      output: '{"ok":true}',
      provider_id: 'pubmed',
      query: 'cancer biomarkers',
      sort: 'relevance',
      total_found: 0,
      items: [],
      meta: {
        provider_id: 'pubmed',
        resolved_api_key_ref_id: null,
        api_key_resolved: false,
        rate_limit_tier: 'default',
        latency_ms: 1
      }
    })

    const context = createToolContext()
    const result = await suite.pubmedSearch({ query: 'cancer biomarkers' }, context)

    expect(mocks.executePubmedSearch).toHaveBeenCalledTimes(1)
    expect(mocks.executePubmedSearch).toHaveBeenCalledWith(
      { query: 'cancer biomarkers' },
      expect.objectContaining({
        paperRetrievalService,
        logger: context.logger,
        trace: context.trace,
        runContext: context.runContext,
        modelContext: context.modelContext
      })
    )
    expect(result.output).toBe('{"ok":true}')
  })
})
