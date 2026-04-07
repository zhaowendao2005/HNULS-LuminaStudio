import { describe, expect, it, vi } from 'vitest'
import { NormalChatAgentRuntime } from './agent-runtime'

describe('NormalChatAgentRuntime', () => {
  it('persists functioncall parts into the committed assistant message', async () => {
    const insertedMessages: any[] = []

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
          errorMessage: null
        },
        feedback: [],
        loadedActionKeys: [],
        schemaDebugSnapshot: null
      })),
      createBatchResult: vi.fn(() => ({ results: [], feedback: [], childSummaries: [] }))
    }

    const roundPersistenceService = {
      createQueuedModelCall: vi.fn(() => 'model-call-1'),
      markModelCallRunning: vi.fn(),
      appendModelCallStream: vi.fn(),
      completeModelCall: vi.fn(),
      failModelCall: vi.fn()
    }

    const messagesRepository = {
      insert: vi.fn((message: any) => {
        insertedMessages.push(message)
      })
    }

    const tasksRepository = {
      markRunning: vi.fn(),
      markPhase: vi.fn(),
      markSucceeded: vi.fn()
    }

    const agentRunsRepository = {
      markRunningById: vi.fn(),
      markSucceededById: vi.fn(),
      markFailedById: vi.fn(),
      createChild: vi.fn()
    }

    const actionRunsRepository = {
      create: vi.fn(() => ({ id: 'action-run-1' })),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn()
    }

    const streamPublisher = {
      publish: vi.fn(() => 0)
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
      messagesRepository as any,
      tasksRepository as any,
      agentRunsRepository as any,
      actionRunsRepository as any,
      streamPublisher as any
    )

    await runtime.start({
      taskId: 'task-1',
      requestId: 'request-1',
      topicId: 'topic-1',
      executionSnapshot: {
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
      } as any,
      rootAgentRun: {
        id: 'agent-run-1',
        depth: 0,
        parentAgentRunId: null,
        goal: 'Find papers'
      } as any,
      signal: new AbortController().signal
    })

    expect(messagesRepository.insert).toHaveBeenCalledTimes(1)
    expect(insertedMessages).toHaveLength(1)
    expect(insertedMessages[0].parts).toEqual([
      {
        kind: 'functioncall',
        callId: 'action-run-1',
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
      {
        kind: 'text',
        text: 'Final answer'
      }
    ])
  })
})
