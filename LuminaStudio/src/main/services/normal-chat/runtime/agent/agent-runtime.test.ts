import { describe, expect, it, vi } from 'vitest'
import { NormalChatActionExecutorService } from '../actions/shared/action-executor.service'
import { NormalChatAgentRuntime } from './agent-runtime'

describe('NormalChatAgentRuntime', () => {
  it('emits finish with stable assistant message id instead of committing assistant parts', async () => {
    const graphRunner = {
      run: vi.fn(async (handlers: any) => {
        await handlers.prepareRound()
        await handlers.buildPrompt()
        await handlers.invokeModel()
        await handlers.parseEnvelope()
        await handlers.executeActions()
        await handlers.finalize()
        return { visitedNodes: [] }
      })
    }

    const promptBuilder = {
      buildRoundPromptBundle: vi.fn(() => ({
        promptDocument: 'prompt',
        compiledSystemPrompt: 'system',
        compiledRoundPrompt: 'round',
        roundSections: {},
        systemSections: {}
      }))
    }

    const modelAdapter = {
      invokeRound: vi.fn(async () => 'raw-model-output')
    }

    const assistantOutputParser = {
      parse: vi.fn(() => ({
        body_md: 'Final answer',
        action_calls: [
          {
            actionKey: 'functioncall.pubmed_search',
            input: { query: 'covid-19' }
          }
        ],
        thinking_md: null
      }))
    }

    const actionResolutionService = {
      resolveEnabledActionsFromSnapshot: vi.fn(() => [])
    }

    const loadedActionSpecService = {
      resolveLoadedActions: vi.fn(() => [])
    }

    const actionExecutor = {
      execute: vi.fn(async () => ({
        functionCallPart: {
          kind: 'functioncall',
          callId: 'call-1',
          functionCallName: 'functioncall.pubmed_search',
          title: 'PubMed Search',
          status: 'success',
          input: '{"query":"covid-19"}',
          output: '{"items":[]}',
          errorMessage: null,
          isStreaming: false,
          roundIndex: 1,
          batchIndex: 0,
          parallelIndex: 0,
          depth: 0,
          decisionReason: null
        },
        resultRecord: {
          status: 'success',
          output: { items: [] },
          errorMessage: null,
          title: 'PubMed Search',
          modelFacingSummaryMd: 'ok'
        },
        feedback: [],
        loadedActionKeys: [],
        transcriptVisibility: 'inline',
        schemaDebugSnapshot: null,
        childSummaries: [],
        actionRunId: 'action-run-1'
      })),
      createBatchResult: vi.fn(() => ({
        results: [],
        feedback: [],
        childSummaries: [],
        executedActionRunIds: ['action-run-1']
      }))
    }

    const roundPersistenceService = {
      createQueuedModelCall: vi.fn(() => 'model-call-1'),
      markModelCallRunning: vi.fn(),
      appendModelCallStream: vi.fn(),
      completeModelCall: vi.fn(),
      failModelCall: vi.fn()
    }

    const streamPublisher = {
      appendTraceEntry: vi.fn(),
      publish: vi.fn(() => 0),
      appendProviderRequestCaptured: vi.fn(),
      appendAgentStatus: vi.fn(),
      appendAgentRunCreated: vi.fn(),
      appendAgentRunFinished: vi.fn(),
      appendAgentRunFailed: vi.fn(),
      appendRoundMemoryUpdated: vi.fn(),
      appendActionRunCreated: vi.fn(),
      appendActionValidated: vi.fn(),
      appendActionStatus: vi.fn(),
      appendActionRunFinished: vi.fn(),
      appendActionRunFailed: vi.fn()
    }

    const runtime = new NormalChatAgentRuntime(
      graphRunner as any,
      promptBuilder as any,
      modelAdapter as any,
      assistantOutputParser as any,
      actionResolutionService as any,
      loadedActionSpecService as any,
      actionExecutor as any,
      roundPersistenceService as any,
      streamPublisher as any
    )

    const executionSnapshot = {
      request: {
        input: 'Find papers',
        providerId: 'openai',
        modelId: 'gpt-test'
      },
      runtime: {
        maxReasoningSteps: 3,
        streamingEnabled: false,
        systemPrompt: 'system'
      },
      conversation: {
        id: 'conversation-1',
        title: 'Topic'
      },
      historyMessages: [],
      promptInjections: [],
      actions: []
    } as any

    await runtime.start({
      taskId: 'task-1',
      requestId: 'request-1',
      topicId: 'topic-1',
      executionSnapshot,
      rootAgentRun: {
        id: 'agent-run-1',
        depth: 0,
        parentAgentRunId: null,
        goal: 'Find papers'
      } as any,
      signal: new AbortController().signal
    })

    const publishCalls = streamPublisher.publish.mock.calls as unknown as Array<
      [string, string, string, { type: string; assistantMessageId?: string | null }]
    >
    expect(
      publishCalls.some(
        ([, , , event]) =>
          event.type === 'finish' && event.assistantMessageId === 'assistant:request-1'
      )
    ).toBe(true)
    expect(publishCalls.some(([, , , event]) => event.type === 'status')).toBe(false)
    expect(roundPersistenceService.createQueuedModelCall).toHaveBeenCalledWith(
      expect.objectContaining({
        parentActionRunId: null
      })
    )
  })

  it('uses the dispatch action run id as parentActionRunId for child model calls', async () => {
    const graphRunner = {
      run: vi.fn(async (handlers: any) => {
        await handlers.prepareRound()
        await handlers.buildPrompt()
        await handlers.invokeModel()
        await handlers.parseEnvelope()
        if (handlers.getState().hasActionsToExecute) {
          await handlers.executeActions()
        }
        if (handlers.getState().shouldContinue) {
          await handlers.prepareRound()
          await handlers.buildPrompt()
          await handlers.invokeModel()
          await handlers.parseEnvelope()
        }
        await handlers.finalize()
        return { visitedNodes: [] }
      })
    }

    const promptBuilder = {
      buildRoundPromptBundle: vi.fn(() => ({
        promptDocument: 'prompt',
        compiledSystemPrompt: 'system',
        compiledRoundPrompt: 'round',
        roundSections: {},
        systemSections: {}
      }))
    }

    const modelAdapter = {
      invokeRound: vi.fn(async () => 'raw-model-output')
    }

    const assistantOutputParser = {
      parse: vi
        .fn()
        .mockReturnValueOnce({
          body_md: 'Dispatch child',
          action_calls: [
            {
              actionKey: 'system.dispatch_sub_agent',
              input: {
                goal: 'Child task',
                enabled_action_keys: [],
                pubmed_mode: 'fast',
                max_react_steps: 1
              }
            }
          ],
          thinking_md: null
        })
        .mockReturnValueOnce({
          body_md: 'Parent synthesis',
          action_calls: [],
          thinking_md: null
        })
        .mockReturnValueOnce({
          body_md: 'Child synthesis',
          action_calls: [],
          thinking_md: null
        })
    }

    const actionResolutionService = {
      resolveEnabledActionsFromSnapshot: vi.fn((actions) => actions)
    }

    const loadedActionSpecService = {
      resolveLoadedActions: vi.fn(() => [])
    }

    const roundPersistenceService = {
      createQueuedModelCall: vi
        .fn()
        .mockReturnValueOnce('parent-model-call-1')
        .mockReturnValueOnce('child-model-call-1')
        .mockReturnValueOnce('parent-model-call-2'),
      markModelCallRunning: vi.fn(),
      appendModelCallStream: vi.fn(),
      completeModelCall: vi.fn(),
      failModelCall: vi.fn()
    }

    const streamPublisher = {
      appendTraceEntry: vi.fn(),
      publish: vi.fn(() => 0),
      appendProviderRequestCaptured: vi.fn(),
      appendAgentStatus: vi.fn(),
      appendAgentRunCreated: vi.fn(),
      appendAgentRunFinished: vi.fn(),
      appendAgentRunFailed: vi.fn(),
      appendRoundMemoryUpdated: vi.fn(),
      appendActionRunCreated: vi.fn(),
      appendActionValidated: vi.fn(),
      appendActionStatus: vi.fn(),
      appendActionRunFinished: vi.fn(),
      appendActionRunFailed: vi.fn()
    }

    const actionExecutor = new NormalChatActionExecutorService({
      execute: vi.fn()
    } as any)

    const runtime = new NormalChatAgentRuntime(
      graphRunner as any,
      promptBuilder as any,
      modelAdapter as any,
      assistantOutputParser as any,
      actionResolutionService as any,
      loadedActionSpecService as any,
      actionExecutor,
      roundPersistenceService as any,
      streamPublisher as any
    )
    actionExecutor.setSubAgentRunner(runtime)

    await runtime.start({
      taskId: 'task-1',
      requestId: 'request-1',
      topicId: 'topic-1',
      executionSnapshot: {
        request: {
          input: 'Dispatch task',
          providerId: 'openai',
          modelId: 'gpt-test'
        },
        runtime: {
          maxReasoningSteps: 2,
          maxRecursionDepth: 2,
          streamingEnabled: false,
          systemPrompt: 'system',
          persistencePreset: 'full'
        },
        conversation: {
          id: 'conversation-1',
          title: 'Topic'
        },
        historyMessages: [],
        promptInjections: [],
        actions: [
          {
            actionKey: 'system.dispatch_sub_agent',
            kind: 'system',
            enabled: true,
            mode: 'fast',
            definition: {} as any
          }
        ]
      } as any,
      rootAgentRun: {
        id: 'root-agent-run-1',
        depth: 0,
        parentAgentRunId: null,
        goal: 'Dispatch task'
      } as any,
      signal: new AbortController().signal
    })

    expect(roundPersistenceService.createQueuedModelCall).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        agentRunId: 'root-agent-run-1',
        parentActionRunId: null,
        turnKind: 'answer'
      })
    )
    expect(roundPersistenceService.createQueuedModelCall).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        parentActionRunId: expect.any(String),
        turnKind: 'answer',
        depth: 1
      })
    )
    expect(roundPersistenceService.createQueuedModelCall).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        agentRunId: 'root-agent-run-1',
        parentActionRunId: null,
        turnKind: 'post_action_synthesis',
        consumedActionRunIds: [expect.any(String)],
        synthesisRequired: true
      })
    )

    const publishCalls = streamPublisher.publish.mock.calls as unknown as Array<
      [string, string, string, Record<string, unknown>]
    >
    expect(
      publishCalls.some(
        ([, , , event]) =>
          event.type === 'assistant-part-upsert' &&
          (event.part as { functionCallName?: string } | undefined)?.functionCallName ===
            'system.dispatch_sub_agent'
      )
    ).toBe(false)
    expect(
      publishCalls.some(
        ([, , , event]) =>
          (event.type === 'assistant-body-delta' || event.type === 'assistant-final-chunk') &&
          event.depth === 1
      )
    ).toBe(false)
  })
})
