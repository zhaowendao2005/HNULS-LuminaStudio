import type {
  NormalChatConversationStreamEvent,
  NormalChatFunctionCallMessagePart,
  NormalChatRequestEntry,
  NormalChatRequestHeadSnapshot
} from '@preload/types'
import { logger } from '@main/services/logger'
import { NormalChatRequestEntriesRepository } from '../../repositories/request-entries.repository'
import { NormalChatRequestHeadsRepository } from '../../repositories/request-heads.repository'
import { nowIso } from '../../shared/utils'

const log = logger.scope('NormalChatStreamPublisher')
const DELTA_FLUSH_MS = 250
const DELTA_FLUSH_BYTES = 1024

type PersistencePreset = 'light' | 'full'

type BufferedDelta = {
  requestId: string
  entityKind: 'message' | 'model_call'
  entityId: string
  parentEntityId: string | null
  visibility: 'transcript' | 'debug'
  payloadKind: 'message_visible_delta' | 'model_call_raw_delta'
  payloadBase: Record<string, unknown>
  chunks: string[]
  timer: NodeJS.Timeout | null
}

type TraceEntryInput = {
  requestId: string
  entityKind: NormalChatRequestEntry['entityKind']
  entityId: string
  parentEntityId: string | null
  op: NormalChatRequestEntry['op']
  visibility: NormalChatRequestEntry['visibility']
  payload: Record<string, unknown>
  createdAt?: string
  updateHead?: {
    status?: NormalChatRequestHeadSnapshot['status']
    phase?: NormalChatRequestHeadSnapshot['phase']
    errorMessage?: string | null
    assistantMessageId?: string | null
    startedAt?: string | null
    finishedAt?: string | null
  }
}

function estimateBytes(value: string): number {
  return Buffer.byteLength(value, 'utf8')
}

function getAssistantTraceMessageId(requestId: string): string {
  return `assistant:${requestId}`
}

function createSyntheticSubAgentPart(
  event: Extract<NormalChatConversationStreamEvent, { type: 'subagent-dispatched' }>
): NormalChatFunctionCallMessagePart {
  return {
    kind: 'functioncall',
    callId: event.actionRunId,
    functionCallName: 'system.dispatch_sub_agent',
    title: 'system.dispatch_sub_agent',
    status: 'running',
    input: '',
    output: '',
    errorMessage: null,
    isStreaming: true,
    roundIndex: event.roundIndex,
    batchIndex: event.batchIndex,
    parallelIndex: event.parallelIndex,
    depth: event.depth,
    decisionReason: event.goal
  }
}

export class NormalChatStreamPublisher {
  private streamEmitter: ((event: NormalChatConversationStreamEvent) => void) | null = null
  private traceEntryEmitter: ((entry: NormalChatRequestEntry) => void) | null = null
  private readonly persistencePresetByRequestId = new Map<string, PersistencePreset>()
  private readonly bufferedDeltas = new Map<string, BufferedDelta>()
  private readonly assistantMessageCreatedByRequestId = new Set<string>()

  constructor(
    private readonly requestHeadsRepository: NormalChatRequestHeadsRepository,
    private readonly requestEntriesRepository: NormalChatRequestEntriesRepository
  ) {}

  setEmitter(emitter: (event: NormalChatConversationStreamEvent) => void): void {
    this.streamEmitter = emitter
  }

  setTraceEntryEmitter(emitter: (entry: NormalChatRequestEntry) => void): void {
    this.traceEntryEmitter = emitter
  }

  setPersistencePreset(requestId: string, preset: PersistencePreset): void {
    this.persistencePresetByRequestId.set(requestId, preset)
  }

  clearPersistence(requestId: string): void {
    this.flushRequestBuffers(requestId)
    this.persistencePresetByRequestId.delete(requestId)
    this.assistantMessageCreatedByRequestId.delete(requestId)
  }

  publish(
    _taskId: string,
    _topicId: string,
    requestId: string,
    event: NormalChatConversationStreamEvent
  ): number | null {
    try {
      const lastSeq = this.persistEventToTrace(requestId, event)
      this.streamEmitter?.(event)
      return lastSeq
    } catch (error) {
      log.error('Failed to persist request trace entry', error, {
        requestId,
        eventType: event.type
      })
      this.streamEmitter?.(event)
      return null
    }
  }

  appendTraceEntry(input: TraceEntryInput): number | null {
    const head = this.requestHeadsRepository.getByRequestId(input.requestId)
    if (!head) {
      return null
    }

    const timestamp = input.createdAt ?? nowIso()
    const entry: Omit<NormalChatRequestEntry, 'seq'> = {
      requestId: input.requestId,
      assistantId: head.assistantId,
      topicId: head.topicId,
      conversationId: head.conversationId,
      entityKind: input.entityKind,
      entityId: input.entityId,
      parentEntityId: input.parentEntityId,
      op: input.op,
      visibility: input.visibility,
      payloadJson: JSON.stringify(input.payload),
      createdAt: timestamp
    }

    const entrySeq = this.requestEntriesRepository.append(entry)
    this.traceEntryEmitter?.({ ...entry, seq: entrySeq })

    if (input.updateHead) {
      this.requestHeadsRepository.updateStatus({
        requestId: input.requestId,
        status: input.updateHead.status ?? head.status,
        phase: input.updateHead.phase ?? head.phase,
        errorMessage:
          input.updateHead.errorMessage === undefined
            ? head.errorMessage
            : input.updateHead.errorMessage,
        assistantMessageId:
          input.updateHead.assistantMessageId === undefined
            ? head.assistantMessageId
            : input.updateHead.assistantMessageId,
        startedAt: input.updateHead.startedAt ?? head.startedAt,
        finishedAt: input.updateHead.finishedAt ?? head.finishedAt,
        updatedAt: timestamp,
        lastEntrySeq: entrySeq
      })
    } else {
      this.requestHeadsRepository.updateStatus({
        requestId: input.requestId,
        status: head.status,
        phase: head.phase,
        errorMessage: head.errorMessage,
        assistantMessageId: head.assistantMessageId,
        startedAt: head.startedAt,
        finishedAt: head.finishedAt,
        updatedAt: timestamp,
        lastEntrySeq: entrySeq
      })
    }

    return entrySeq
  }

  appendModelCallCreated(input: {
    requestId: string
    modelCallId: string
    agentRunId: string
    parentActionRunId: string | null
    turnKind: 'answer' | 'action_plan' | 'post_action_synthesis'
    producedActionCount: number
    consumedActionRunIds: string[]
    synthesisRequired: boolean
    depth: number
    roundIndex: number
    callIndexInAgent: number
    requestPayload: Record<string, unknown>
    prompt: {
      systemSections: Record<string, unknown>
      roundSections: Record<string, unknown>
      compiledSystemPrompt: string
      compiledRoundPrompt: string
      promptDocument: string
      trimSnapshot: Record<string, unknown> | null
    }
    historyMessages: unknown[]
    loadedActions: unknown[]
    actionResults: unknown[]
    persist: boolean
  }): string {
    if (!input.persist) {
      return input.modelCallId
    }

    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'model_call',
      entityId: input.modelCallId,
      parentEntityId: input.parentActionRunId,
      op: 'created',
      visibility: 'debug',
      payload: {
        kind: 'model_call_created',
        agentRunId: input.agentRunId,
        parentActionRunId: input.parentActionRunId,
        turnKind: input.turnKind,
        producedActionCount: input.producedActionCount,
        consumedActionRunIds: input.consumedActionRunIds,
        synthesisRequired: input.synthesisRequired,
        depth: input.depth,
        roundIndex: input.roundIndex,
        callIndexInAgent: input.callIndexInAgent,
        requestPayload: input.requestPayload
      }
    })

    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'model_call',
      entityId: input.modelCallId,
      parentEntityId: input.parentActionRunId,
      op: 'patched',
      visibility: 'debug',
      payload: {
        kind: 'prompt_compiled',
        systemSections: input.prompt.systemSections,
        roundSections: input.prompt.roundSections,
        compiledSystemPrompt: input.prompt.compiledSystemPrompt,
        compiledRoundPrompt: input.prompt.compiledRoundPrompt,
        compiledPromptMarkdown: input.prompt.promptDocument,
        trimSnapshot: input.prompt.trimSnapshot,
        historyMessages: input.historyMessages,
        loadedActions: input.loadedActions,
        actionResults: input.actionResults
      }
    })

    return input.modelCallId
  }

  appendModelCallFinished(input: {
    requestId: string
    modelCallId: string
    responseEnvelope: Record<string, unknown>
    finalReplyMd: string
    responseStreamText: string
    turnKind: 'answer' | 'action_plan' | 'post_action_synthesis'
    producedActionCount: number
    consumedActionRunIds: string[]
    synthesisRequired: boolean
  }): void {
    this.flushBufferedDeltaByEntity(input.requestId, 'model_call', input.modelCallId)
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'model_call',
      entityId: input.modelCallId,
      parentEntityId: null,
      op: 'patched',
      visibility: 'debug',
      payload: {
        kind: 'response_parsed',
        responseEnvelope: input.responseEnvelope
      }
    })
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'model_call',
      entityId: input.modelCallId,
      parentEntityId: null,
      op: 'finished',
      visibility: 'debug',
      payload: {
        kind: 'model_call_finished',
        finalReplyMd: input.finalReplyMd,
        responseStreamText: input.responseStreamText,
        turnKind: input.turnKind,
        producedActionCount: input.producedActionCount,
        consumedActionRunIds: input.consumedActionRunIds,
        synthesisRequired: input.synthesisRequired
      }
    })
  }

  appendModelCallFailed(input: {
    requestId: string
    modelCallId: string
    errorMessage: string
    responseStreamText: string
  }): void {
    this.flushBufferedDeltaByEntity(input.requestId, 'model_call', input.modelCallId)
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'model_call',
      entityId: input.modelCallId,
      parentEntityId: null,
      op: 'failed',
      visibility: 'debug',
      payload: {
        kind: 'model_call_failed',
        errorMessage: input.errorMessage,
        responseStreamText: input.responseStreamText
      }
    })
  }

  appendAgentRunCreated(input: {
    requestId: string
    agentRunId: string
    parentAgentRunId: string | null
    depth: number
    roleKind: string
    templateId: string
    goal: string
    maxReactSteps: number
    maxChildDepth: number
    modelProviderId: string | null
    modelId: string | null
  }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'agent_run',
      entityId: input.agentRunId,
      parentEntityId: input.parentAgentRunId,
      op: 'created',
      visibility: 'agent',
      payload: {
        kind: 'agent_run_created',
        parentAgentRunId: input.parentAgentRunId,
        depth: input.depth,
        roleKind: input.roleKind,
        templateId: input.templateId,
        goal: input.goal,
        maxReactSteps: input.maxReactSteps,
        maxChildDepth: input.maxChildDepth,
        modelProviderId: input.modelProviderId,
        modelId: input.modelId
      }
    })
  }

  appendAgentStatus(input: { requestId: string; agentRunId: string; status: string }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'agent_run',
      entityId: input.agentRunId,
      parentEntityId: null,
      op: 'status',
      visibility: 'agent',
      payload: {
        kind: 'agent_status',
        status: input.status
      }
    })
  }

  appendAgentRunFinished(input: {
    requestId: string
    agentRunId: string
    finalText: string
    reactCount: number
  }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'agent_run',
      entityId: input.agentRunId,
      parentEntityId: null,
      op: 'finished',
      visibility: 'agent',
      payload: {
        kind: 'agent_run_finished',
        finalText: input.finalText,
        reactCount: input.reactCount
      }
    })
  }

  appendAgentRunFailed(input: {
    requestId: string
    agentRunId: string
    errorMessage: string
    reactCount: number
  }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'agent_run',
      entityId: input.agentRunId,
      parentEntityId: null,
      op: 'failed',
      visibility: 'agent',
      payload: {
        kind: 'agent_run_failed',
        errorMessage: input.errorMessage,
        reactCount: input.reactCount
      }
    })
  }

  appendRoundMemoryUpdated(input: {
    requestId: string
    agentRunId: string
    roundIndex: number
    artifactSummary: string
  }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'agent_run',
      entityId: input.agentRunId,
      parentEntityId: null,
      op: 'patched',
      visibility: 'agent',
      payload: {
        kind: 'round_memory_updated',
        roundIndex: input.roundIndex,
        artifactSummary: input.artifactSummary
      }
    })
  }

  appendActionRunCreated(input: {
    requestId: string
    actionRunId: string
    agentRunId: string
    actionKey: string
    actionKind: string
    mode: string | null
    roundIndex: number
    batchIndex: number
    parallelIndex: number
    inputJson: string
  }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'action_run',
      entityId: input.actionRunId,
      parentEntityId: input.agentRunId,
      op: 'created',
      visibility: 'debug',
      payload: {
        kind: 'action_run_created',
        agentRunId: input.agentRunId,
        actionKey: input.actionKey,
        actionKind: input.actionKind,
        mode: input.mode,
        roundIndex: input.roundIndex,
        batchIndex: input.batchIndex,
        parallelIndex: input.parallelIndex,
        inputJson: input.inputJson
      }
    })
  }

  appendActionStatus(input: {
    requestId: string
    actionRunId: string
    status: string
    message: string | null
    schemaDebugSnapshot: unknown | null
  }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'action_run',
      entityId: input.actionRunId,
      parentEntityId: null,
      op: 'status',
      visibility: 'debug',
      payload: {
        kind: 'action_status',
        status: input.status,
        message: input.message,
        schemaDebugSnapshot: input.schemaDebugSnapshot
      }
    })
  }

  appendActionValidated(input: {
    requestId: string
    actionRunId: string
    schemaDebugSnapshot: unknown | null
    message: string | null
  }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'action_run',
      entityId: input.actionRunId,
      parentEntityId: null,
      op: 'patched',
      visibility: 'debug',
      payload: {
        kind: 'action_validated',
        schemaDebugSnapshot: input.schemaDebugSnapshot,
        message: input.message
      }
    })
  }

  appendActionRunFinished(input: {
    requestId: string
    actionRunId: string
    outputJson: string
  }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'action_run',
      entityId: input.actionRunId,
      parentEntityId: null,
      op: 'finished',
      visibility: 'debug',
      payload: {
        kind: 'action_run_finished',
        outputJson: input.outputJson
      }
    })
  }

  appendActionRunFailed(input: {
    requestId: string
    actionRunId: string
    errorMessage: string
  }): void {
    this.appendTraceEntry({
      requestId: input.requestId,
      entityKind: 'action_run',
      entityId: input.actionRunId,
      parentEntityId: null,
      op: 'failed',
      visibility: 'debug',
      payload: {
        kind: 'action_run_failed',
        errorMessage: input.errorMessage
      }
    })
  }

  private persistEventToTrace(
    requestId: string,
    event: NormalChatConversationStreamEvent
  ): number | null {
    const head = this.requestHeadsRepository.getByRequestId(requestId)
    if (!head) {
      return null
    }

    const preset = this.persistencePresetByRequestId.get(requestId) ?? 'full'
    const timestamp = nowIso()
    let lastSeq: number | null = null

    const commit = (input: TraceEntryInput): void => {
      const seq = this.appendTraceEntry(input)
      if (seq !== null) {
        lastSeq = seq
      }
    }

    switch (event.type) {
      case 'assistant-text-delta': {
        if (preset === 'full') {
          this.queueDelta({
            head,
            entityKind: 'model_call',
            entityId: event.modelCallId,
            parentEntityId: null,
            visibility: 'debug',
            payloadKind: 'model_call_raw_delta',
            payloadBase: {
              modelCallId: event.modelCallId,
              roundIndex: event.roundIndex,
              depth: event.depth
            },
            delta: event.delta
          })
        }
        break
      }
      case 'assistant-body-delta':
      case 'assistant-final-chunk': {
        this.ensureAssistantMessageCreated(head, timestamp)
        this.queueDelta({
          head,
          entityKind: 'message',
          entityId: getAssistantTraceMessageId(requestId),
          parentEntityId: requestId,
          visibility: 'transcript',
          payloadKind: 'message_visible_delta',
          payloadBase: {
            role: 'assistant',
            modelCallId: event.modelCallId,
            turnKind: event.turnKind,
            roundIndex: event.roundIndex,
            depth: event.depth
          },
          delta: event.delta,
          flushImmediately: event.type === 'assistant-final-chunk'
        })
        break
      }
      case 'assistant-part-upsert': {
        this.flushRequestBuffers(requestId)
        this.ensureAssistantMessageCreated(head, timestamp)
        commit({
          requestId,
          entityKind: 'message',
          entityId: getAssistantTraceMessageId(requestId),
          parentEntityId: requestId,
          op: 'patched',
          visibility: 'transcript',
          payload: {
            kind: 'message_part_upsert',
            part: event.part
          },
          createdAt: timestamp
        })
        break
      }
      case 'subagent-dispatched': {
        this.flushRequestBuffers(requestId)
        this.ensureAssistantMessageCreated(head, timestamp)
        commit({
          requestId,
          entityKind: 'message',
          entityId: getAssistantTraceMessageId(requestId),
          parentEntityId: requestId,
          op: 'patched',
          visibility: 'transcript',
          payload: {
            kind: 'message_part_upsert',
            part: createSyntheticSubAgentPart(event)
          },
          createdAt: timestamp
        })
        break
      }
      case 'action-validated': {
        break
      }
      case 'message-committed': {
        this.flushRequestBuffers(requestId)
        if (event.message.role === 'assistant') {
          commit({
            requestId,
            entityKind: 'message',
            entityId: getAssistantTraceMessageId(requestId),
            parentEntityId: requestId,
            op: 'finished',
            visibility: 'transcript',
            payload: {
              kind: 'message_finished',
              messageId: event.message.id,
              parts: event.message.parts,
              createdAt: event.message.createdAt,
              updatedAt: event.message.updatedAt
            },
            createdAt: timestamp,
            updateHead: {
              assistantMessageId: event.message.id
            }
          })
        }
        break
      }
      case 'finish': {
        this.flushRequestBuffers(requestId)
        commit({
          requestId,
          entityKind: 'request',
          entityId: requestId,
          parentEntityId: null,
          op: 'finished',
          visibility: 'internal',
          payload: {
            kind: 'request_finished',
            assistantMessageId: event.assistantMessageId
          },
          createdAt: timestamp,
          updateHead: {
            status:
              head.status === 'failed'
                ? 'failed'
                : head.status === 'aborted'
                  ? 'aborted'
                  : 'succeeded',
            phase: 'finished',
            finishedAt: timestamp,
            assistantMessageId: event.assistantMessageId ?? head.assistantMessageId
          }
        })
        break
      }
      case 'error': {
        this.flushRequestBuffers(requestId)
        commit({
          requestId,
          entityKind: 'request',
          entityId: requestId,
          parentEntityId: null,
          op: 'failed',
          visibility: 'internal',
          payload: {
            kind: 'request_failed',
            message: event.message,
            rawErrorJson: event.rawErrorJson ?? null
          },
          createdAt: timestamp,
          updateHead: {
            status: 'failed',
            phase: 'finished',
            errorMessage: event.message,
            finishedAt: timestamp
          }
        })
        break
      }
      case 'memory-updated': {
        break
      }
      case 'assistant-progress':
      case 'prompt-built':
      case 'prompt-budget-trimmed':
      default:
        break
    }

    return lastSeq
  }

  private ensureAssistantMessageCreated(
    head: NormalChatRequestHeadSnapshot,
    timestamp: string
  ): void {
    if (this.assistantMessageCreatedByRequestId.has(head.requestId)) {
      return
    }

    const seq = this.appendTraceEntry({
      requestId: head.requestId,
      entityKind: 'message',
      entityId: getAssistantTraceMessageId(head.requestId),
      parentEntityId: head.requestId,
      op: 'created',
      visibility: 'transcript',
      payload: {
        kind: 'message_created',
        role: 'assistant',
        parts: [],
        createdAt: timestamp,
        updatedAt: timestamp
      },
      createdAt: timestamp
    })

    if (seq !== null) {
      this.assistantMessageCreatedByRequestId.add(head.requestId)
    }
  }

  private queueDelta(input: {
    head: NormalChatRequestHeadSnapshot
    entityKind: 'message' | 'model_call'
    entityId: string
    parentEntityId: string | null
    visibility: 'transcript' | 'debug'
    payloadKind: 'message_visible_delta' | 'model_call_raw_delta'
    payloadBase: Record<string, unknown>
    delta: string
    flushImmediately?: boolean
  }): void {
    const bufferKey = `${input.head.requestId}:${input.entityKind}:${input.entityId}:${input.payloadKind}`
    const existing = this.bufferedDeltas.get(bufferKey)

    if (existing) {
      existing.chunks.push(input.delta)
      if (
        input.flushImmediately ||
        input.delta.includes('\n') ||
        this.bufferedBytes(existing) >= DELTA_FLUSH_BYTES
      ) {
        this.flushBufferedDelta(bufferKey)
      }
      return
    }

    const buffer: BufferedDelta = {
      requestId: input.head.requestId,
      entityKind: input.entityKind,
      entityId: input.entityId,
      parentEntityId: input.parentEntityId,
      visibility: input.visibility,
      payloadKind: input.payloadKind,
      payloadBase: input.payloadBase,
      chunks: [input.delta],
      timer: null
    }
    this.bufferedDeltas.set(bufferKey, buffer)

    if (
      input.flushImmediately ||
      input.delta.includes('\n') ||
      this.bufferedBytes(buffer) >= DELTA_FLUSH_BYTES
    ) {
      this.flushBufferedDelta(bufferKey)
      return
    }

    buffer.timer = setTimeout(() => {
      this.flushBufferedDelta(bufferKey)
    }, DELTA_FLUSH_MS)
  }

  private bufferedBytes(buffer: BufferedDelta): number {
    return estimateBytes(buffer.chunks.join(''))
  }

  private flushBufferedDelta(bufferKey: string): void {
    const buffer = this.bufferedDeltas.get(bufferKey)
    if (!buffer) {
      return
    }

    if (buffer.timer) {
      clearTimeout(buffer.timer)
    }

    const delta = buffer.chunks.join('')
    this.bufferedDeltas.delete(bufferKey)
    if (!delta) {
      return
    }

    this.appendTraceEntry({
      requestId: buffer.requestId,
      entityKind: buffer.entityKind,
      entityId: buffer.entityId,
      parentEntityId: buffer.parentEntityId,
      op: 'delta',
      visibility: buffer.visibility,
      payload: {
        kind: buffer.payloadKind,
        delta,
        ...buffer.payloadBase
      }
    })
  }

  private flushBufferedDeltaByEntity(
    requestId: string,
    entityKind: 'message' | 'model_call',
    entityId: string
  ): void {
    for (const key of this.bufferedDeltas.keys()) {
      const buffer = this.bufferedDeltas.get(key)
      if (!buffer) {
        continue
      }
      if (
        buffer.requestId === requestId &&
        buffer.entityKind === entityKind &&
        buffer.entityId === entityId
      ) {
        this.flushBufferedDelta(key)
      }
    }
  }

  private flushRequestBuffers(requestId: string): void {
    for (const key of this.bufferedDeltas.keys()) {
      const buffer = this.bufferedDeltas.get(key)
      if (buffer?.requestId === requestId) {
        this.flushBufferedDelta(key)
      }
    }
  }
}
