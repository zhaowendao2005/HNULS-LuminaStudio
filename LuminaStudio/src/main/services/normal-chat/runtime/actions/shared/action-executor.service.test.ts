import { describe, expect, it, vi } from 'vitest'
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
        actionRunId: 'action-run-1',
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
        actionRunId: 'action-run-2',
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

  it('passes the current action run id to dispatch_sub_agent', async () => {
    const service = new NormalChatActionExecutorService({
      execute: vi.fn()
    } as any)
    const subAgentRunner = {
      runSubAgent: vi.fn(async () => ({
        childAgentRunId: 'child-agent-1',
        summaryMarkdown: 'done',
        finalAnswer: 'done'
      }))
    }
    service.setSubAgentRunner(subAgentRunner)

    const executed = await service.execute({
      call: {
        actionKey: 'system.dispatch_sub_agent',
        input: {
          goal: 'Verify child dispatch',
          enabled_action_keys: ['functioncall.pubmed_search'],
          pubmed_mode: 'fast',
          max_react_steps: 1
        }
      },
      resolvedActions: [
        {
          actionKey: 'system.dispatch_sub_agent',
          kind: 'system',
          enabled: true,
          mode: 'fast',
          definition: {} as any
        }
      ],
      roundIndex: 2,
      batchIndex: 0,
      parallelIndex: 0,
      depth: 1,
      context: {
        taskId: 'task-1',
        requestId: 'request-1',
        actionRunId: 'action-run-dispatch-1',
        roundIndex: 2,
        agentDepth: 1,
        executionSnapshot: {} as any
      }
    })

    expect(subAgentRunner.runSubAgent).toHaveBeenCalledWith({
      goal: 'Verify child dispatch',
      enabledActionKeys: ['functioncall.pubmed_search'],
      parentActionRunId: 'action-run-dispatch-1',
      pubmedMode: 'fast',
      maxReactSteps: 1
    })
    expect(executed.resultRecord.status).toBe('success')
  })

  it('includes executed action run ids in batch results', () => {
    const service = new NormalChatActionExecutorService({
      execute: vi.fn()
    } as any)

    const batch = service.createBatchResult([
      {
        actionRunId: 'action-run-1',
        resultRecord: {} as any,
        loadedActionKeys: [],
        functionCallPart: {} as any,
        feedback: [],
        childSummaries: [],
        schemaDebugSnapshot: null
      },
      {
        actionRunId: 'action-run-2',
        resultRecord: {} as any,
        loadedActionKeys: [],
        functionCallPart: {} as any,
        feedback: [],
        childSummaries: [],
        schemaDebugSnapshot: null
      }
    ])

    expect(batch.executedActionRunIds).toEqual(['action-run-1', 'action-run-2'])
  })
})