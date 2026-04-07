import { describe, expect, it } from 'vitest'
import { NormalChatActionExecutorService } from './action-executor.service'

describe('NormalChatActionExecutorService', () => {
  it('autofills optional pubmed_search fields when only query is provided', async () => {
    const service = new NormalChatActionExecutorService({
      execute: async (input) => ({
        result: {
          provider_id: 'pubmed',
          query: input.query,
          sort: input.sort,
          total_found: 0,
          items: []
        }
      })
    } as any)

    const executed = await service.execute({
      call: {
        actionKey: 'functioncall.pubmed_search',
        input: {
          query: ' BRCA1 breast cancer '
        }
      },
      resolvedActions: [
        {
          actionKey: 'functioncall.pubmed_search',
          kind: 'functioncall',
          enabled: true,
          mode: 'fast',
          definition: {} as any
        }
      ],
      roundIndex: 1,
      batchIndex: 0,
      parallelIndex: 0,
      depth: 0,
      context: {
        taskId: 'task-1',
        requestId: 'request-1',
        roundIndex: 1,
        agentDepth: 0,
        executionSnapshot: {} as any
      }
    })

    expect(executed.resultRecord.status).toBe('success')
    expect(JSON.parse(executed.resultRecord.inputJson)).toEqual({
      query: 'BRCA1 breast cancer',
      top_k: 5,
      sort: 'relevance',
      date_from: null,
      date_to: null,
      api_key_ref_id: null
    })
    expect(JSON.parse(executed.functionCallPart.input)).toEqual({
      query: 'BRCA1 breast cancer',
      top_k: 5,
      sort: 'relevance',
      date_from: null,
      date_to: null,
      api_key_ref_id: null
    })
  })

  it('normalizes blank optional pubmed_search fields to null', async () => {
    const service = new NormalChatActionExecutorService({
      execute: async (input) => ({
        result: {
          provider_id: 'pubmed',
          query: input.query,
          sort: input.sort,
          total_found: 0,
          items: []
        }
      })
    } as any)

    const executed = await service.execute({
      call: {
        actionKey: 'functioncall.pubmed_search',
        input: {
          query: 'plant immunity',
          date_from: '',
          date_to: '',
          api_key_ref_id: ''
        }
      },
      resolvedActions: [
        {
          actionKey: 'functioncall.pubmed_search',
          kind: 'functioncall',
          enabled: true,
          mode: 'fast',
          definition: {} as any
        }
      ],
      roundIndex: 1,
      batchIndex: 0,
      parallelIndex: 0,
      depth: 0,
      context: {
        taskId: 'task-1',
        requestId: 'request-1',
        roundIndex: 1,
        agentDepth: 0,
        executionSnapshot: {} as any
      }
    })

    expect(JSON.parse(executed.resultRecord.inputJson)).toMatchObject({
      date_from: null,
      date_to: null,
      api_key_ref_id: null
    })
  })
})
