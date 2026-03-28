import type {
  NormalChatConversationDevDetailMockId,
  NormalChatConversationDevScenarioCard,
  NormalChatConversationDevScenarioDefinition,
  NormalChatConversationDevScenarioId,
  NormalChatConversationMessage,
  NormalChatConversationRuntimeTrace,
  NormalChatConversationStreamEvent,
  NormalChatConversationTurnDetail,
  NormalChatConversationDevPlaybackAction,
  NormalChatFunctionCallMessagePart,
  NormalChatRequestMetrics,
  NormalChatSendMessageAccepted,
  NormalChatSendMessageRequest
} from '@preload/types'
import type { NormalChatRuntimeAgentTree } from '../runtime-trace/types'

interface PendingAssistantReply {
  requestId: string
  topicId: string
  timers: ReturnType<typeof setTimeout>[]
  abort: () => void
}

interface ScenarioPlaybackContext {
  request: NormalChatSendMessageRequest
  requestId: string
  userMessage: NormalChatConversationMessage
}

const listeners = new Set<(event: NormalChatConversationStreamEvent) => void>()
const messagesByTopicId = new Map<string, NormalChatConversationMessage[]>()
const pendingReplies = new Map<string, PendingAssistantReply>()
const turnDetailByRequestId = new Map<string, NormalChatConversationTurnDetail>()
const preparedScenarioByTopicId = new Map<string, NormalChatConversationDevScenarioId>()
const scenarioByRequestId = new Map<string, NormalChatConversationDevScenarioId>()
let preparedScenarioFallback: NormalChatConversationDevScenarioId | null = null

let messageCounter = 1
let requestCounter = 1

function cloneMessages(topicId: string): NormalChatConversationMessage[] {
  return structuredClone(messagesByTopicId.get(topicId) ?? [])
}

function emit(event: NormalChatConversationStreamEvent): void {
  listeners.forEach((listener) => listener(structuredClone(event)))
}

function appendMessage(topicId: string, message: NormalChatConversationMessage): void {
  const nextMessages = [...(messagesByTopicId.get(topicId) ?? []), message]
  messagesByTopicId.set(topicId, nextMessages)
}

function removeMessagesByRequestId(topicId: string, requestId: string): void {
  const currentMessages = messagesByTopicId.get(topicId) ?? []
  messagesByTopicId.set(
    topicId,
    currentMessages.filter((message) => message.requestId !== requestId)
  )
}

function createMessage(
  topicId: string,
  requestId: string,
  role: 'user' | 'assistant',
  text: string
): NormalChatConversationMessage {
  const now = new Date().toISOString()
  const messageId = `message-mock-${messageCounter}`
  messageCounter += 1

  return {
    id: messageId,
    topicId,
    requestId,
    role,
    parts: [{ kind: 'text', text }],
    createdAt: now,
    updatedAt: now
  }
}

function createAssistantMessage(
  topicId: string,
  requestId: string,
  parts: NormalChatConversationMessage['parts']
): NormalChatConversationMessage {
  const now = new Date().toISOString()
  const messageId = `message-mock-${messageCounter}`
  messageCounter += 1

  return {
    id: messageId,
    topicId,
    requestId,
    role: 'assistant',
    parts,
    createdAt: now,
    updatedAt: now
  }
}

function buildMessageText(parts: NormalChatConversationMessage['parts']): string {
  return parts
    .filter((part) => part.kind === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim()
}

function createBaseTurnDetail(
  request: NormalChatSendMessageRequest,
  requestId: string,
  userMessage: NormalChatConversationMessage
): NormalChatConversationTurnDetail {
  return {
    requestId,
    topicId: request.topicId,
    assistantId: 'assistant-mock',
    assistantName: 'Dev Mock Assistant',
    assistantEmoji: 'AI',
    topicTitle: 'Dev Mock Topic',
    hasTrace: false,
    requestRecord: null,
    responseRecord: {
      chunks: [],
      finalText: '',
      aborted: false,
      errorMessage: null,
      completedAt: null
    },
    runtimeTrace: null,
    messages: [userMessage]
  }
}

function updateTurnDetail(
  requestId: string,
  updater: (detail: NormalChatConversationTurnDetail) => NormalChatConversationTurnDetail
): void {
  const currentDetail = turnDetailByRequestId.get(requestId)
  if (!currentDetail) {
    return
  }

  turnDetailByRequestId.set(requestId, updater(structuredClone(currentDetail)))
}

function appendTurnDetailChunk(requestId: string, delta: string): void {
  updateTurnDetail(requestId, (detail) => ({
    ...detail,
    responseRecord: detail.responseRecord
      ? {
          ...detail.responseRecord,
          chunks: [...detail.responseRecord.chunks, delta],
          finalText: `${detail.responseRecord.finalText}${delta}`
        }
      : detail.responseRecord
  }))
}

function upsertTurnDetailFunctionCallPart(
  requestId: string,
  part: NormalChatFunctionCallMessagePart
): void {
  updateTurnDetail(requestId, (detail) => {
    const assistantIndex = detail.messages.findIndex((message) => message.role === 'assistant')
    if (assistantIndex === -1) {
      const assistantMessage = createAssistantMessage(detail.topicId, requestId, [part])
      return {
        ...detail,
        messages: [...detail.messages, assistantMessage]
      }
    }

    const targetMessage = detail.messages[assistantIndex]
    const nextParts = [...targetMessage.parts]
    const currentPartIndex = nextParts.findIndex(
      (currentPart) => currentPart.kind === 'functioncall' && currentPart.callId === part.callId
    )

    if (currentPartIndex >= 0) {
      nextParts[currentPartIndex] = part
    } else {
      nextParts.push(part)
    }

    const nextMessages = [...detail.messages]
    nextMessages[assistantIndex] = {
      ...targetMessage,
      parts: nextParts,
      updatedAt: new Date().toISOString()
    }

    return {
      ...detail,
      messages: nextMessages
    }
  })
}

function setTurnDetailRuntimeTrace(
  requestId: string,
  runtimeTrace: NormalChatConversationRuntimeTrace
): void {
  updateTurnDetail(requestId, (detail) => ({
    ...detail,
    hasTrace: Boolean(runtimeTrace.agentTree),
    runtimeTrace
  }))
}

function setTurnDetailFinalMessage(
  requestId: string,
  assistantMessage: NormalChatConversationMessage,
  options?: {
    runtimeTrace?: NormalChatConversationRuntimeTrace | null
    errorMessage?: string | null
    aborted?: boolean
  }
): void {
  updateTurnDetail(requestId, (detail) => ({
    ...detail,
    hasTrace: Boolean(options?.runtimeTrace?.agentTree ?? detail.runtimeTrace?.agentTree),
    runtimeTrace: options?.runtimeTrace ?? detail.runtimeTrace,
    responseRecord: detail.responseRecord
      ? {
          ...detail.responseRecord,
          finalText: buildMessageText(assistantMessage.parts),
          aborted: options?.aborted ?? false,
          errorMessage: options?.errorMessage ?? null,
          completedAt: new Date().toISOString()
        }
      : detail.responseRecord,
    messages: [
      ...detail.messages.filter((message) => message.role !== 'assistant'),
      assistantMessage
    ]
  }))
}

function markTurnDetailAborted(requestId: string): void {
  updateTurnDetail(requestId, (detail) => ({
    ...detail,
    responseRecord: detail.responseRecord
      ? {
          ...detail.responseRecord,
          aborted: true,
          completedAt: new Date().toISOString()
        }
      : detail.responseRecord
  }))
}

function markTurnDetailErrored(requestId: string, errorMessage: string): void {
  updateTurnDetail(requestId, (detail) => ({
    ...detail,
    responseRecord: detail.responseRecord
      ? {
          ...detail.responseRecord,
          errorMessage,
          completedAt: new Date().toISOString()
        }
      : detail.responseRecord
  }))
}

function deleteTurnDetail(requestId: string): void {
  turnDetailByRequestId.delete(requestId)
}

function createFunctionCallPart(input: {
  callId: string
  functionCallName: string
  title: string
  status: NormalChatFunctionCallMessagePart['status']
  input: string
  output?: string
  errorMessage?: string | null
  roundIndex: number
  batchIndex: number
  parallelIndex: number
  depth: number
  decisionReason?: string | null
}): NormalChatFunctionCallMessagePart {
  return {
    kind: 'functioncall',
    callId: input.callId,
    functionCallName: input.functionCallName,
    title: input.title,
    status: input.status,
    input: input.input,
    output: input.output ?? '',
    errorMessage: input.errorMessage ?? null,
    isStreaming: input.status === 'queued' || input.status === 'running',
    roundIndex: input.roundIndex,
    batchIndex: input.batchIndex,
    parallelIndex: input.parallelIndex,
    depth: input.depth,
    decisionReason: input.decisionReason ?? null
  }
}

function createMetrics(
  request: NormalChatSendMessageRequest,
  modelCallCount: number,
  totalTokens: number
): NormalChatRequestMetrics {
  return {
    providerId: request.providerId,
    providerName: request.providerId,
    modelId: request.modelId,
    modelName: request.modelId,
    firstTokenLatencyMs: 160,
    promptTokens: Math.max(totalTokens - 420, 256),
    completionTokens: Math.min(totalTokens, 420),
    totalTokens,
    modelCallCount,
    streamingEnabled: true
  }
}

function emitStatus(
  topicId: string,
  requestId: string,
  phase: 'sending' | 'thinking' | 'streaming' | 'done',
  message: string
): void {
  emit({
    type: 'status',
    requestId,
    topicId,
    phase,
    message
  })
}

function emitProgress(topicId: string, requestId: string, message: string): void {
  emit({
    type: 'assistant-progress',
    requestId,
    topicId,
    message
  })
}

function emitAssistantTextChunk(topicId: string, requestId: string, delta: string): void {
  emit({
    type: 'assistant-final-chunk',
    requestId,
    topicId,
    delta
  })
  appendTurnDetailChunk(requestId, delta)
}

function emitFunctionCallPart(
  topicId: string,
  requestId: string,
  part: NormalChatFunctionCallMessagePart
): void {
  emit({
    type: 'assistant-part-upsert',
    requestId,
    topicId,
    part
  })
  upsertTurnDetailFunctionCallPart(requestId, part)
}

function emitRuntimeTrace(
  topicId: string,
  requestId: string,
  runtimeTrace: NormalChatConversationRuntimeTrace
): void {
  emit({
    type: 'runtime-trace-upsert',
    requestId,
    topicId,
    runtimeTrace
  })
  setTurnDetailRuntimeTrace(requestId, runtimeTrace)
}

function commitAssistantMessage(
  topicId: string,
  requestId: string,
  assistantMessage: NormalChatConversationMessage,
  options?: {
    runtimeTrace?: NormalChatConversationRuntimeTrace | null
    errorMessage?: string | null
    aborted?: boolean
  }
): void {
  appendMessage(topicId, assistantMessage)
  setTurnDetailFinalMessage(requestId, assistantMessage, options)
  emit({
    type: 'message-committed',
    requestId,
    topicId,
    message: assistantMessage
  })
}

function finishRequest(
  topicId: string,
  requestId: string,
  assistantMessageId: string | null
): void {
  emitStatus(topicId, requestId, 'done', 'Dev mock playback finished.')
  emit({
    type: 'finish',
    requestId,
    topicId,
    assistantMessageId
  })
}

function createAgentHierarchyTrace(
  request: NormalChatSendMessageRequest,
  requestId: string,
  stage: 'planning' | 'collecting' | 'repairing' | 'completed'
): NormalChatConversationRuntimeTrace {
  const agents: NormalChatRuntimeAgentTree['agents'] = {
    [`${requestId}-root`]: {
      agentId: `${requestId}-root`,
      depth: 0,
      roleKind: 'director',
      taskKind: 'main-agent',
      goal: 'Split the request and coordinate tool usage.',
      summary:
        stage === 'completed'
          ? 'Root agent merged evidence from worker and repair branches.'
          : 'Root agent is still coordinating the execution plan.',
      finalResult:
        stage === 'completed'
          ? 'Final answer was assembled from worker results and repair feedback.'
          : null,
      status: stage === 'completed' ? 'completed' : 'running',
      retryCount: 0,
      errorMessage: null,
      childAgentIds: [`${requestId}-worker`, `${requestId}-repair`],
      planHistory: [
        {
          stepIndex: 1,
          phase: 'analysis',
          action: 'split-task',
          reasoning: 'Separate evidence collection from error recovery.',
          statusText: 'Planning delegation',
          budgetSummary: '2 child agents reserved',
          stopReason: null,
          actionsJson: '{"action":"split-task"}',
          parsedJson: '{"accepted":true}'
        },
        {
          stepIndex: 2,
          phase: 'dispatch',
          action: 'delegate',
          reasoning: 'Worker gathers facts while repair branch handles failed call retries.',
          statusText: stage === 'completed' ? 'Delegation completed' : 'Delegation running',
          budgetSummary: 'parallel budget active',
          stopReason: stage === 'completed' ? 'children-finished' : null,
          actionsJson: '{"children":["worker","repair"]}',
          parsedJson: '{"parallel":true}'
        }
      ],
      helperInvocations: []
    },
    [`${requestId}-worker`]: {
      agentId: `${requestId}-worker`,
      depth: 1,
      roleKind: 'worker',
      taskKind: 'evidence-agent',
      goal: 'Collect high-confidence source snippets.',
      summary:
        stage === 'planning'
          ? 'Worker is queued for collection.'
          : stage === 'completed'
            ? 'Worker completed evidence collection.'
            : 'Worker is collecting evidence.',
      finalResult: stage === 'completed' ? '3 evidence clusters were returned.' : null,
      status: stage === 'planning' ? 'queued' : 'completed',
      retryCount: 0,
      errorMessage: null,
      childAgentIds: [`${requestId}-worker-child`],
      planHistory: [
        {
          stepIndex: 1,
          phase: 'collect',
          action: 'search-batches',
          reasoning: 'Batch the searches to keep the root chain short.',
          statusText: stage === 'planning' ? 'Waiting for dispatch' : 'Search batches completed',
          budgetSummary: '3 searches',
          stopReason: stage === 'completed' ? 'report-back' : null,
          actionsJson: '{"queries":3}',
          parsedJson: '{"done":true}'
        }
      ],
      helperInvocations: [
        {
          callId: `${requestId}-worker-search`,
          helperId: 'search-helper',
          displayName: 'Search helper',
          status: stage === 'completed' ? 'success' : 'running',
          argsJson: '{"query":"signal transduction review"}',
          outputJson: stage === 'completed' ? '{"hits":3}' : '{}',
          errorMessage: null,
          resultSummary: stage === 'completed' ? 'Search completed with 3 hits.' : null,
          failureSummary: null,
          startedAt: new Date().toISOString()
        }
      ]
    },
    [`${requestId}-worker-child`]: {
      agentId: `${requestId}-worker-child`,
      depth: 2,
      roleKind: 'worker',
      taskKind: 'sub-agent',
      goal: 'Verify one branch of evidence.',
      summary:
        stage === 'collecting'
          ? 'Grandchild is still validating one evidence branch.'
          : 'Grandchild verification finished.',
      finalResult: stage === 'completed' ? 'Verification passed.' : null,
      status: stage === 'collecting' ? 'running' : 'completed',
      retryCount: 0,
      errorMessage: null,
      childAgentIds: [],
      planHistory: [],
      helperInvocations: []
    },
    [`${requestId}-repair`]: {
      agentId: `${requestId}-repair`,
      depth: 1,
      roleKind: 'repair',
      taskKind: 'retry-agent',
      goal: 'Recover failed tool calls and decide fallback usage.',
      summary:
        stage === 'repairing'
          ? 'Repair branch is retrying and preparing a fallback.'
          : stage === 'completed'
            ? 'Repair branch completed fallback and returned a safe summary.'
            : 'Repair branch has not started recovery yet.',
      finalResult: stage === 'completed' ? 'Fallback notes were merged into final answer.' : null,
      status: stage === 'repairing' ? 'running' : stage === 'completed' ? 'completed' : 'queued',
      retryCount: stage === 'completed' ? 1 : 0,
      errorMessage: stage === 'repairing' ? 'One upstream call failed before fallback.' : null,
      childAgentIds: [`${requestId}-repair-failed`],
      planHistory: [
        {
          stepIndex: 1,
          phase: 'repair',
          action: 'retry-call',
          reasoning: 'Retry once before switching to fallback.',
          statusText: stage === 'completed' ? 'Fallback finished' : 'Repair in progress',
          budgetSummary: '1 retry + fallback',
          stopReason: stage === 'completed' ? 'fallback-complete' : null,
          actionsJson: '{"retry":1,"fallback":true}',
          parsedJson: '{"fallbackTriggered":true}'
        }
      ],
      helperInvocations: [
        {
          callId: `${requestId}-repair-helper`,
          helperId: 'repair-helper',
          displayName: 'Repair helper',
          status: stage === 'completed' ? 'success' : 'running',
          argsJson: '{"strategy":"fallback-summary"}',
          outputJson: stage === 'completed' ? '{"mode":"fallback"}' : '{}',
          errorMessage: null,
          resultSummary: stage === 'completed' ? 'Fallback summary prepared.' : null,
          failureSummary: null,
          startedAt: new Date().toISOString()
        }
      ]
    },
    [`${requestId}-repair-failed`]: {
      agentId: `${requestId}-repair-failed`,
      depth: 2,
      roleKind: 'worker',
      taskKind: 'failed-branch',
      goal: 'Represent a branch that failed before fallback took over.',
      summary: 'A retry branch failed before the repair helper switched to fallback mode.',
      finalResult: null,
      status: 'failed',
      retryCount: 1,
      errorMessage: 'Retry branch failed with an upstream timeout.',
      childAgentIds: [],
      planHistory: [
        {
          stepIndex: 1,
          phase: 'repair',
          action: 'retry-call',
          reasoning: 'One retry was attempted before escalating to fallback.',
          statusText: 'Retry failed',
          budgetSummary: 'retry budget exhausted',
          stopReason: 'upstream-timeout',
          actionsJson: '{"retry":1}',
          parsedJson: '{"status":"failed"}'
        }
      ],
      helperInvocations: []
    }
  }

  return {
    traceVersion: 1,
    agentTree: {
      requestId,
      rootAgentId: `${requestId}-root`,
      fallbackTriggered: stage === 'repairing' || stage === 'completed',
      agents
    },
    metrics: stage === 'completed' ? createMetrics(request, 4, 1840) : null,
    execution: {
      scenarioId: 'agent-hierarchy',
      stage
    }
  }
}

function buildScenarioDefinitions(
  context: ScenarioPlaybackContext
): Record<NormalChatConversationDevScenarioId, NormalChatConversationDevScenarioDefinition> {
  const functionCallMatrixCalls = {
    queue: createFunctionCallPart({
      callId: `${context.requestId}-batch1-queued`,
      functionCallName: 'pubmedSearch',
      title: 'Queued literature search',
      status: 'queued',
      input: '{"query":"cell signaling review","limit":5}',
      roundIndex: 1,
      batchIndex: 0,
      parallelIndex: 0,
      depth: 0,
      decisionReason: 'Prime the queue state before requests fan out.'
    }),
    running: createFunctionCallPart({
      callId: `${context.requestId}-batch1-running`,
      functionCallName: 'pubmedSearch',
      title: 'Running literature search',
      status: 'running',
      input: '{"query":"cell signaling review","limit":5}',
      roundIndex: 1,
      batchIndex: 0,
      parallelIndex: 0,
      depth: 0,
      decisionReason: 'First call left in-flight to expose streaming state.'
    }),
    success: createFunctionCallPart({
      callId: `${context.requestId}-batch1-success`,
      functionCallName: 'pubmedSearch',
      title: 'Evidence search',
      status: 'success',
      input: '{"query":"MAPK signaling review","limit":5}',
      output: '{"hits":["Paper A","Paper B"]}',
      roundIndex: 1,
      batchIndex: 0,
      parallelIndex: 1,
      depth: 0,
      decisionReason: 'Collect a clean successful result in the first batch.'
    }),
    error: createFunctionCallPart({
      callId: `${context.requestId}-batch1-error`,
      functionCallName: 'knowledgeSearch',
      title: 'Reference retrieval',
      status: 'error',
      input: '{"query":"ERK pathway biomarkers"}',
      output: '',
      errorMessage: 'Reference backend timed out while collecting full text.',
      roundIndex: 1,
      batchIndex: 0,
      parallelIndex: 2,
      depth: 0,
      decisionReason: 'Expose failed tool-call rendering and error text.'
    }),
    aborted: createFunctionCallPart({
      callId: `${context.requestId}-batch2-aborted`,
      functionCallName: 'crossCheck',
      title: 'Cross-check follow-up',
      status: 'aborted',
      input: '{"paperId":"Paper A","mode":"consistency"}',
      output: '',
      errorMessage: 'Follow-up was interrupted after enough evidence had been collected.',
      roundIndex: 2,
      batchIndex: 1,
      parallelIndex: 0,
      depth: 0,
      decisionReason: 'Show aborted follow-up work after the answer is already stable.'
    }),
    recovery: createFunctionCallPart({
      callId: `${context.requestId}-batch2-success`,
      functionCallName: 'summarizeFindings',
      title: 'Summary synthesis',
      status: 'success',
      input: '{"mode":"bullet-summary","sourceCount":3}',
      output: '{"summary":"3 stable evidence clusters"}',
      roundIndex: 2,
      batchIndex: 1,
      parallelIndex: 1,
      depth: 0,
      decisionReason: 'Close the second batch with one stable successful call.'
    })
  }

  const streamingBaseline: NormalChatConversationDevScenarioDefinition = {
    id: 'streaming-baseline',
    title: 'Streaming Baseline',
    description: 'Pure text streaming with request metrics and no function calls.',
    input: 'Explain what this frontend-only chatflow playback is for in one concise answer.',
    badge: 'Text',
    accentClass: 'border-emerald-200 bg-emerald-50',
    detailMockId: 'detail-streaming-baseline',
    steps: [
      {
        delayMs: 80,
        actions: [
          {
            kind: 'status',
            phase: 'thinking',
            message: 'Preparing a clean text-only reply.'
          },
          {
            kind: 'text-chunk',
            delta: 'This frontend dev playback exercises the normal streaming path.\n\n'
          }
        ]
      },
      {
        delayMs: 180,
        actions: [
          {
            kind: 'progress',
            message: 'Streaming assistant text without any tool or agent detours.'
          },
          {
            kind: 'text-chunk',
            delta:
              'Use it to validate message layout, pending state, token metrics, and final commit behavior.'
          }
        ]
      },
      {
        delayMs: 320,
        actions: [
          {
            kind: 'commit',
            assistant: {
              parts: [
                {
                  kind: 'text',
                  text: 'This frontend dev playback exercises the normal streaming path.\n\nUse it to validate message layout, pending state, token metrics, and final commit behavior.'
                }
              ],
              runtimeTrace: {
                traceVersion: 1,
                agentTree: null,
                metrics: createMetrics(context.request, 1, 960),
                execution: {
                  scenarioId: 'streaming-baseline',
                  mode: 'text-only'
                }
              }
            }
          }
        ]
      }
    ]
  }

  const functioncallMatrix: NormalChatConversationDevScenarioDefinition = {
    id: 'functioncall-matrix',
    title: 'FunctionCall Matrix',
    description:
      'Mixed text and multi-batch function calls covering queued, running, success, error, and aborted states.',
    input: 'Search literature, cross-check it, and summarize what matters for the UI.',
    badge: 'Calls',
    accentClass: 'border-sky-200 bg-sky-50',
    detailMockId: 'detail-functioncall-matrix',
    steps: [
      {
        delayMs: 60,
        actions: [
          {
            kind: 'status',
            phase: 'thinking',
            message: 'Planning a multi-batch tool sequence.'
          },
          {
            kind: 'text-chunk',
            delta:
              'I will mix streaming text with tool batches so the message renderer sees all functioncall shapes.\n\n'
          }
        ]
      },
      {
        delayMs: 160,
        actions: [
          {
            kind: 'progress',
            message: 'Batch 1 is entering queued and running states.'
          },
          {
            kind: 'functioncall',
            part: functionCallMatrixCalls.queue
          },
          {
            kind: 'functioncall',
            part: functionCallMatrixCalls.running
          },
          {
            kind: 'functioncall',
            part: functionCallMatrixCalls.success
          },
          {
            kind: 'functioncall',
            part: functionCallMatrixCalls.error
          }
        ]
      },
      {
        delayMs: 320,
        actions: [
          {
            kind: 'text-chunk',
            delta:
              'Batch 1 already has one clean success and one failure, so batch 2 focuses on recovery and interruption handling.\n\n'
          }
        ]
      },
      {
        delayMs: 470,
        actions: [
          {
            kind: 'progress',
            message: 'Batch 2 mixes recovery and early abort.'
          },
          {
            kind: 'functioncall',
            part: functionCallMatrixCalls.aborted
          },
          {
            kind: 'functioncall',
            part: functionCallMatrixCalls.recovery
          }
        ]
      },
      {
        delayMs: 690,
        actions: [
          {
            kind: 'commit',
            assistant: {
              parts: [
                {
                  kind: 'text',
                  text: 'I will mix streaming text with tool batches so the message renderer sees all functioncall shapes.\n\n'
                },
                functionCallMatrixCalls.running,
                functionCallMatrixCalls.success,
                functionCallMatrixCalls.error,
                {
                  kind: 'text',
                  text: 'Batch 1 already has one clean success and one failure, so batch 2 focuses on recovery and interruption handling.\n\n'
                },
                functionCallMatrixCalls.aborted,
                functionCallMatrixCalls.recovery,
                {
                  kind: 'text',
                  text: 'The final answer now includes a queued/running path, a success path, a failure path, and one aborted follow-up. That is enough to expose both summary cards and per-call detail entry points.'
                }
              ],
              runtimeTrace: {
                traceVersion: 1,
                agentTree: null,
                metrics: createMetrics(context.request, 3, 1420),
                execution: {
                  scenarioId: 'functioncall-matrix',
                  batches: 2,
                  exposedStatuses: ['queued', 'running', 'success', 'error', 'aborted']
                }
              }
            }
          }
        ]
      }
    ]
  }

  const dispatchCall = createFunctionCallPart({
    callId: `${context.requestId}-dispatch-subagent`,
    functionCallName: 'dispatchSubAgent',
    title: 'Dispatch child agents',
    status: 'success',
    input: '{"workerCount":2,"repairEnabled":true}',
    output: '{"accepted":true,"children":["worker","repair"]}',
    roundIndex: 1,
    batchIndex: 0,
    parallelIndex: 0,
    depth: 0,
    decisionReason: 'Expose multi-level agent orchestration in one chat turn.'
  })

  const agentHierarchy: NormalChatConversationDevScenarioDefinition = {
    id: 'agent-hierarchy',
    title: 'Agent Hierarchy',
    description:
      'Multi-level agent orchestration with worker, repair, fallback, helper, and nested child states.',
    input:
      'Break this task apart, delegate collection, retry one failed branch, and then summarize.',
    badge: 'Agent',
    accentClass: 'border-violet-200 bg-violet-50',
    detailMockId: 'detail-agent-hierarchy',
    steps: [
      {
        delayMs: 90,
        actions: [
          {
            kind: 'status',
            phase: 'thinking',
            message: 'Director agent is planning the delegation tree.'
          },
          {
            kind: 'text-chunk',
            delta:
              'The root agent is splitting the task into evidence collection and repair branches.\n\n'
          },
          {
            kind: 'runtime-trace',
            runtimeTrace: createAgentHierarchyTrace(context.request, context.requestId, 'planning')
          }
        ]
      },
      {
        delayMs: 220,
        actions: [
          {
            kind: 'functioncall',
            part: dispatchCall
          },
          {
            kind: 'progress',
            message: 'Worker branch is collecting evidence while repair branch stays queued.'
          },
          {
            kind: 'runtime-trace',
            runtimeTrace: createAgentHierarchyTrace(
              context.request,
              context.requestId,
              'collecting'
            )
          }
        ]
      },
      {
        delayMs: 420,
        actions: [
          {
            kind: 'text-chunk',
            delta:
              'One worker grandchild is still validating evidence, and a repair branch is being activated to handle a failed retry.\n\n'
          },
          {
            kind: 'runtime-trace',
            runtimeTrace: createAgentHierarchyTrace(context.request, context.requestId, 'repairing')
          }
        ]
      },
      {
        delayMs: 700,
        actions: [
          {
            kind: 'commit',
            assistant: {
              parts: [
                {
                  kind: 'text',
                  text: 'The root agent is splitting the task into evidence collection and repair branches.\n\n'
                },
                dispatchCall,
                {
                  kind: 'text',
                  text: 'One worker grandchild is still validating evidence, and a repair branch is being activated to handle a failed retry.\n\nThe final summary now reflects a multi-level agent tree with fallback, helper invocations, and nested worker verification.'
                }
              ],
              runtimeTrace: createAgentHierarchyTrace(
                context.request,
                context.requestId,
                'completed'
              )
            }
          }
        ]
      }
    ]
  }

  const requestInterrupt: NormalChatConversationDevScenarioDefinition = {
    id: 'request-interrupt',
    title: 'Interrupt And Error',
    description:
      'Pending message, running tool call, explicit interrupt/error cleanup, and empty final commit path.',
    input: 'Start a long task, interrupt it halfway, and expose the request error path.',
    badge: 'Abort',
    accentClass: 'border-amber-200 bg-amber-50',
    detailMockId: 'detail-request-interrupt',
    steps: [
      {
        delayMs: 80,
        actions: [
          {
            kind: 'status',
            phase: 'thinking',
            message: 'Long-running request started.'
          },
          {
            kind: 'text-chunk',
            delta:
              'Starting a long-running pass that will intentionally stop before a final commit.\n\n'
          }
        ]
      },
      {
        delayMs: 180,
        actions: [
          {
            kind: 'functioncall',
            part: createFunctionCallPart({
              callId: `${context.requestId}-interrupt-running`,
              functionCallName: 'deepSearch',
              title: 'Long-running deep search',
              status: 'running',
              input: '{"query":"very long task"}',
              output: '',
              roundIndex: 1,
              batchIndex: 0,
              parallelIndex: 0,
              depth: 0,
              decisionReason: 'Keep one tool call running when the request is interrupted.'
            })
          },
          {
            kind: 'progress',
            message: 'Waiting on a deep search that will not finish.'
          }
        ]
      },
      {
        delayMs: 360,
        actions: [
          {
            kind: 'error',
            message: 'The request was interrupted before a final assistant message was committed.',
            rawErrorJson: '{"reason":"interrupted","source":"dev-playback"}'
          }
        ]
      }
    ]
  }

  return {
    'streaming-baseline': streamingBaseline,
    'functioncall-matrix': functioncallMatrix,
    'agent-hierarchy': agentHierarchy,
    'request-interrupt': requestInterrupt
  }
}

function applyPlaybackAction(
  action: NormalChatConversationDevPlaybackAction,
  context: ScenarioPlaybackContext
): string | null {
  if (action.kind === 'status') {
    emitStatus(context.request.topicId, context.requestId, action.phase, action.message)
    return null
  }

  if (action.kind === 'progress') {
    emitProgress(context.request.topicId, context.requestId, action.message)
    return null
  }

  if (action.kind === 'text-chunk') {
    emitAssistantTextChunk(context.request.topicId, context.requestId, action.delta)
    return null
  }

  if (action.kind === 'functioncall') {
    emitFunctionCallPart(context.request.topicId, context.requestId, action.part)
    return null
  }

  if (action.kind === 'runtime-trace') {
    emitRuntimeTrace(context.request.topicId, context.requestId, action.runtimeTrace)
    return null
  }

  if (action.kind === 'commit') {
    const assistantMessage = createAssistantMessage(
      context.request.topicId,
      context.requestId,
      action.assistant.parts
    )
    commitAssistantMessage(context.request.topicId, context.requestId, assistantMessage, {
      runtimeTrace: action.assistant.runtimeTrace ?? null,
      errorMessage: action.assistant.errorMessage ?? null,
      aborted: action.assistant.aborted ?? false
    })
    return assistantMessage.id
  }

  markTurnDetailErrored(context.requestId, action.message)
  emit({
    type: 'error',
    requestId: context.requestId,
    topicId: context.request.topicId,
    message: action.message,
    rawErrorJson: action.rawErrorJson ?? null
  })
  return null
}

function runScenarioDefinition(
  scenario: NormalChatConversationDevScenarioDefinition,
  context: ScenarioPlaybackContext
): void {
  const timers: ReturnType<typeof setTimeout>[] = []
  let finished = false
  let latestAssistantMessageId: string | null = null

  scenario.steps.forEach((step, index) => {
    const timer = setTimeout(() => {
      if (finished) {
        return
      }

      step.actions.forEach((action) => {
        const assistantMessageId = applyPlaybackAction(action, context)
        latestAssistantMessageId = assistantMessageId ?? latestAssistantMessageId

        if (action.kind === 'commit') {
          finishRequest(context.request.topicId, context.requestId, latestAssistantMessageId)
          finished = true
        }

        if (action.kind === 'error') {
          finished = true
        }
      })

      if (index === scenario.steps.length - 1 || finished) {
        pendingReplies.delete(context.requestId)
      }
    }, step.delayMs)
    timers.push(timer)
  })

  pendingReplies.set(context.requestId, {
    requestId: context.requestId,
    topicId: context.request.topicId,
    timers,
    abort: () => {
      timers.forEach((timer) => clearTimeout(timer))
      markTurnDetailAborted(context.requestId)
      latestAssistantMessageId =
        turnDetailByRequestId
          .get(context.requestId)
          ?.messages.find((message) => message.role === 'assistant')?.id ?? latestAssistantMessageId
      finishRequest(context.request.topicId, context.requestId, latestAssistantMessageId)
    }
  })
}

function scheduleAssistantReply(request: NormalChatSendMessageRequest, requestId: string): void {
  const context: ScenarioPlaybackContext = {
    request,
    requestId,
    userMessage: createMessage(request.topicId, requestId, 'user', request.input)
  }

  const scenarioId =
    preparedScenarioByTopicId.get(request.topicId) ??
    preparedScenarioFallback ??
    'streaming-baseline'
  preparedScenarioByTopicId.delete(request.topicId)
  preparedScenarioFallback = null
  scenarioByRequestId.set(requestId, scenarioId)

  const scenario = buildScenarioDefinitions(context)[scenarioId]
  runScenarioDefinition(scenario, context)
}

export function prepareNormalChatConversationDevScenario(
  topicId: string,
  scenarioId: NormalChatConversationDevScenarioId
): void {
  preparedScenarioByTopicId.set(topicId, scenarioId)
  preparedScenarioFallback = scenarioId
}

export function clearPreparedNormalChatConversationDevScenario(topicId: string): void {
  preparedScenarioByTopicId.delete(topicId)
  preparedScenarioFallback = null
}

export function getNormalChatConversationDevScenarioIdByRequestId(
  requestId: string
): NormalChatConversationDevScenarioId | null {
  return scenarioByRequestId.get(requestId) ?? null
}

export function getNormalChatConversationDevDetailMockIdByRequestId(
  requestId: string
): NormalChatConversationDevDetailMockId | null {
  const scenarioId = getNormalChatConversationDevScenarioIdByRequestId(requestId)
  if (!scenarioId) {
    return null
  }

  const request = {
    topicId: 'detail-mock-topic',
    providerId: 'openai',
    modelId: 'gpt-4.1',
    input: 'detail mock'
  } satisfies NormalChatSendMessageRequest
  const context: ScenarioPlaybackContext = {
    request,
    requestId,
    userMessage: {
      id: 'detail-mock-user',
      topicId: 'detail-mock-topic',
      requestId,
      role: 'user',
      parts: [{ kind: 'text', text: request.input }],
      createdAt: '2026-03-28T00:00:00.000Z',
      updatedAt: '2026-03-28T00:00:00.000Z'
    }
  }

  return buildScenarioDefinitions(context)[scenarioId].detailMockId
}

export function getNormalChatConversationDevScenarioCards(): NormalChatConversationDevScenarioCard[] {
  const request = {
    topicId: 'scenario-cards',
    providerId: 'openai',
    modelId: 'gpt-4.1',
    input: 'cards'
  } satisfies NormalChatSendMessageRequest
  const context: ScenarioPlaybackContext = {
    request,
    requestId: 'scenario-cards',
    userMessage: {
      id: 'scenario-cards-user',
      topicId: 'scenario-cards',
      requestId: 'scenario-cards',
      role: 'user',
      parts: [{ kind: 'text', text: request.input }],
      createdAt: '2026-03-28T00:00:00.000Z',
      updatedAt: '2026-03-28T00:00:00.000Z'
    }
  }

  return Object.values(buildScenarioDefinitions(context)).map(
    ({ id, title, description, input, badge, accentClass, detailMockId }) => ({
      id,
      title,
      description,
      input,
      badge,
      accentClass,
      detailMockId
    })
  )
}

export function resetNormalChatConversationMockState(): void {
  pendingReplies.forEach((pending) => {
    pending.timers.forEach((timer) => clearTimeout(timer))
  })
  pendingReplies.clear()
  messagesByTopicId.clear()
  turnDetailByRequestId.clear()
  preparedScenarioByTopicId.clear()
  scenarioByRequestId.clear()
  preparedScenarioFallback = null
  listeners.clear()
  messageCounter = 1
  requestCounter = 1
}

export const normalChatConversationMock = {
  async getConversation(payload: { topicId: string }) {
    return {
      topicId: payload.topicId,
      messages: cloneMessages(payload.topicId)
    }
  },

  async getConversationTurnDetail(payload: {
    requestId: string
  }): Promise<NormalChatConversationTurnDetail | null> {
    return structuredClone(turnDetailByRequestId.get(payload.requestId) ?? null)
  },

  async sendMessage(payload: NormalChatSendMessageRequest): Promise<NormalChatSendMessageAccepted> {
    const requestId = payload.clientRequestId || `request-mock-${requestCounter}`
    requestCounter += 1

    const userMessage = createMessage(payload.topicId, requestId, 'user', payload.input)
    appendMessage(payload.topicId, userMessage)
    turnDetailByRequestId.set(requestId, createBaseTurnDetail(payload, requestId, userMessage))
    scheduleAssistantReply(payload, requestId)

    return {
      requestId,
      message: structuredClone(userMessage)
    }
  },

  async deleteConversationTurn(payload: { requestId: string }): Promise<void> {
    messagesByTopicId.forEach((_messages, topicId) => {
      removeMessagesByRequestId(topicId, payload.requestId)
    })
    scenarioByRequestId.delete(payload.requestId)
    deleteTurnDetail(payload.requestId)
  },

  async abort(payload: { requestId: string }): Promise<void> {
    const pending = pendingReplies.get(payload.requestId)
    if (!pending) {
      return
    }

    pending.abort()
    pendingReplies.delete(payload.requestId)
  },

  onStream(handler: (event: NormalChatConversationStreamEvent) => void): () => void {
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }
}
