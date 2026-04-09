import type {
  NormalChatActionRunSnapshot,
  NormalChatAgentRunSnapshot,
  NormalChatCapturedProviderRequestSnapshot,
  NormalChatConversationMessage,
  NormalChatFunctionCallMessagePart,
  NormalChatMessagePart,
  NormalChatModelCallSnapshot,
  NormalChatPromptSnapshot,
  NormalChatRequestDetailSnapshot,
  NormalChatRequestEntry,
  NormalChatRequestHeadSnapshot,
  NormalChatSubAgentMessagePart,
  NormalChatTaskExecutionSnapshot,
  NormalChatTaskFinalResponse,
  NormalChatThinkingMessagePart
} from '@preload/types'

type EntryPayload = Record<string, unknown> & { kind?: string }

type MessageRecord = {
  traceId: string
  message: NormalChatConversationMessage
}

function parsePayload(entry: NormalChatRequestEntry): EntryPayload {
  try {
    return JSON.parse(entry.payloadJson) as EntryPayload
  } catch {
    return {}
  }
}

function getAssistantTraceMessageId(requestId: string): string {
  return `assistant:${requestId}`
}

function appendTextPart(
  parts: NormalChatMessagePart[],
  input: {
    delta: string
    modelCallId: string | null
    turnKind: 'answer' | 'action_plan' | 'post_action_synthesis'
    roundIndex: number
    depth: number
  }
): NormalChatMessagePart[] {
  const nextParts = [...parts]
  const lastPart = nextParts.at(-1)
  const canAppendToLast =
    lastPart?.kind === 'text' &&
    lastPart.modelCallId === input.modelCallId &&
    lastPart.turnKind === input.turnKind &&
    lastPart.roundIndex === input.roundIndex &&
    lastPart.depth === input.depth

  if (canAppendToLast && lastPart.kind === 'text') {
    nextParts[nextParts.length - 1] = {
      ...lastPart,
      text: `${lastPart.text}${input.delta}`
    }
    return nextParts
  }

  nextParts.push({
    kind: 'text',
    text: input.delta,
    modelCallId: input.modelCallId,
    turnKind: input.turnKind,
    roundIndex: input.roundIndex,
    depth: input.depth
  })
  return nextParts
}

function upsertFunctionCallPart(
  parts: NormalChatMessagePart[],
  part: NormalChatFunctionCallMessagePart
): NormalChatMessagePart[] {
  const existingIndex = parts.findIndex(
    (item): item is NormalChatFunctionCallMessagePart =>
      item.kind === 'functioncall' && item.callId === part.callId
  )
  const nextParts = [...parts]

  if (existingIndex >= 0) {
    const previous = nextParts[existingIndex] as NormalChatFunctionCallMessagePart
    nextParts[existingIndex] = {
      ...previous,
      ...part,
      input: part.input || previous.input,
      output: part.output || previous.output,
      errorMessage: part.errorMessage ?? previous.errorMessage,
      decisionReason: part.decisionReason ?? previous.decisionReason
    }
    return nextParts
  }

  nextParts.push(part)
  return nextParts
}

function upsertThinkingPart(
  parts: NormalChatMessagePart[],
  part: NormalChatThinkingMessagePart
): NormalChatMessagePart[] {
  const existingIndex = parts.findIndex(
    (item): item is NormalChatThinkingMessagePart =>
      item.kind === 'thinking' &&
      item.title === part.title &&
      item.roundIndex === part.roundIndex &&
      item.depth === part.depth
  )
  const nextParts = [...parts]

  if (existingIndex >= 0) {
    nextParts[existingIndex] = {
      ...(nextParts[existingIndex] as NormalChatThinkingMessagePart),
      ...part
    }
    return nextParts
  }

  nextParts.push(part)
  return nextParts
}

function upsertSubAgentPart(
  parts: NormalChatMessagePart[],
  part: NormalChatSubAgentMessagePart
): NormalChatMessagePart[] {
  const existingIndex = parts.findIndex(
    (item): item is NormalChatSubAgentMessagePart =>
      item.kind === 'subagent' && item.partId === part.partId
  )
  const nextParts = [...parts]

  if (existingIndex >= 0) {
    const previous = nextParts[existingIndex] as NormalChatSubAgentMessagePart
    nextParts[existingIndex] = {
      ...previous,
      ...part,
      childAgentRunId: part.childAgentRunId ?? previous.childAgentRunId
    }
    return nextParts
  }

  nextParts.push(part)
  return nextParts
}

function extractFinalText(messages: NormalChatConversationMessage[]): string {
  const assistantMessage = [...messages].reverse().find((message) => message.role === 'assistant')
  return (
    assistantMessage?.parts
      .filter(
        (part): part is Extract<NormalChatMessagePart, { kind: 'text' }> => part.kind === 'text'
      )
      .map((part) => part.text)
      .join('') ?? ''
  )
}

function createEmptyModelCall(
  head: NormalChatRequestHeadSnapshot | null,
  requestId: string,
  modelCallId: string,
  payload: EntryPayload,
  createdAt: string
): NormalChatModelCallSnapshot {
  return {
    id: modelCallId,
    seq: 0,
    taskId: requestId,
    requestId,
    conversationId: head?.conversationId ?? '',
    agentRunId: String(payload.agentRunId ?? ''),
    parentActionRunId:
      typeof payload.parentActionRunId === 'string' ? payload.parentActionRunId : null,
    turnKind:
      payload.turnKind === 'action_plan' || payload.turnKind === 'post_action_synthesis'
        ? payload.turnKind
        : 'answer',
    producedActionCount: Number(payload.producedActionCount ?? 0),
    consumedActionRunIds: Array.isArray(payload.consumedActionRunIds)
      ? payload.consumedActionRunIds.map((value) => String(value))
      : [],
    synthesisRequired: Boolean(payload.synthesisRequired),
    depth: Number(payload.depth ?? 0),
    roundIndex: Number(payload.roundIndex ?? 0),
    callIndexInAgent: Number(payload.callIndexInAgent ?? 0),
    status: 'queued',
    requestPayloadJson: JSON.stringify(payload.requestPayload ?? {}),
    rawProviderRequest: null,
    compiledPromptJson: {
      systemSections: {
        identity: '',
        outputContract: '',
        actionProtocol: '',
        repairContract: ''
      },
      roundSections: {
        context: '',
        latestActionTurnResults: '',
        priorRoundMemory: '',
        actionDescriptions: '',
        loadedActionSpecs: '',
        actionResults: '',
        actionFeedback: ''
      },
      compiledSystemPrompt: '',
      compiledRoundPrompt: '',
      trimSnapshot: null
    },
    compiledPromptMarkdown: '',
    historyMessagesJson: '[]',
    loadedActionsJson: '[]',
    actionResultsJson: '[]',
    responseStreamText: null,
    responseEnvelopeJson: null,
    finalReplyMd: null,
    errorMessage: null,
    createdAt,
    startedAt: null,
    finishedAt: null,
    updatedAt: createdAt
  }
}

function createExecutionSnapshot(payload: EntryPayload): NormalChatTaskExecutionSnapshot | null {
  const assistant = payload.assistant
  const topic = payload.topic
  const conversation = payload.conversation
  const request = payload.request
  const runtime = payload.runtime

  if (!assistant || !topic || !conversation || !request || !runtime) {
    return null
  }

  return {
    assistant: assistant as NormalChatTaskExecutionSnapshot['assistant'],
    topic: topic as NormalChatTaskExecutionSnapshot['topic'],
    conversation: conversation as NormalChatTaskExecutionSnapshot['conversation'],
    request: request as NormalChatTaskExecutionSnapshot['request'],
    runtime: runtime as NormalChatTaskExecutionSnapshot['runtime'],
    historyMessages: Array.isArray(payload.historyMessages)
      ? (payload.historyMessages as NormalChatConversationMessage[])
      : [],
    promptInjections: Array.isArray(payload.promptInjections)
      ? payload.promptInjections.map((value) => String(value))
      : [],
    actions: Array.isArray(payload.actions)
      ? (payload.actions as NormalChatTaskExecutionSnapshot['actions'])
      : [],
    createdAt: String(payload.createdAt ?? '')
  }
}

export class RequestDetailProjector {
  project(input: {
    head: NormalChatRequestHeadSnapshot | null
    requestId: string
    entries: NormalChatRequestEntry[]
  }): NormalChatRequestDetailSnapshot {
    const messages = new Map<string, MessageRecord>()
    const modelCalls = new Map<string, NormalChatModelCallSnapshot>()
    const actionRuns = new Map<string, NormalChatActionRunSnapshot>()
    const agentRuns = new Map<string, NormalChatAgentRunSnapshot>()
    let executionSnapshot: NormalChatTaskExecutionSnapshot | null = null
    let assistantId = input.head?.assistantId ?? ''
    let assistantName = '助手'
    let assistantEmoji = '🤖'
    let topicId = input.head?.topicId ?? ''
    let topicTitle = ''
    let modelProviderId: string | null = null
    let modelId: string | null = null
    let finalResponse: NormalChatTaskFinalResponse | null = null

    const ensureAssistantMessage = (createdAt: string): MessageRecord => {
      const traceId = getAssistantTraceMessageId(input.requestId)
      const existing = messages.get(traceId)
      if (existing) {
        return existing
      }

      const created: MessageRecord = {
        traceId,
        message: {
          id: traceId,
          topicId,
          requestId: input.requestId,
          role: 'assistant',
          parts: [],
          createdAt,
          updatedAt: createdAt
        }
      }
      messages.set(traceId, created)
      return created
    }

    for (const entry of [...input.entries].sort((left, right) => left.seq - right.seq)) {
      const payload = parsePayload(entry)
      switch (payload.kind) {
        case 'request_created': {
          assistantId = String(
            (payload.assistant as { id?: string } | undefined)?.id ?? assistantId
          )
          assistantName = String(
            (payload.assistant as { name?: string } | undefined)?.name ?? assistantName
          )
          assistantEmoji = String(
            (payload.assistant as { emoji?: string } | undefined)?.emoji ?? assistantEmoji
          )
          topicId = String((payload.topic as { id?: string } | undefined)?.id ?? topicId)
          topicTitle = String(
            (payload.topic as { title?: string } | undefined)?.title ?? topicTitle
          )
          modelProviderId =
            String((payload.request as { providerId?: string } | undefined)?.providerId ?? '') ||
            null
          modelId =
            String((payload.request as { modelId?: string } | undefined)?.modelId ?? '') || null
          executionSnapshot = createExecutionSnapshot(payload)
          break
        }
        case 'message_created': {
          messages.set(entry.entityId, {
            traceId: entry.entityId,
            message: {
              id: entry.entityId,
              topicId: entry.topicId,
              requestId: entry.requestId,
              role: (payload.role as NormalChatConversationMessage['role']) ?? 'assistant',
              parts: Array.isArray(payload.parts) ? (payload.parts as NormalChatMessagePart[]) : [],
              createdAt: String(payload.createdAt ?? entry.createdAt),
              updatedAt: String(payload.updatedAt ?? payload.createdAt ?? entry.createdAt)
            }
          })
          break
        }
        case 'message_visible_delta': {
          const record = ensureAssistantMessage(entry.createdAt)
          record.message = {
            ...record.message,
            parts: appendTextPart(record.message.parts, {
              delta: String(payload.delta ?? ''),
              modelCallId: typeof payload.modelCallId === 'string' ? payload.modelCallId : null,
              turnKind:
                payload.turnKind === 'action_plan' || payload.turnKind === 'post_action_synthesis'
                  ? payload.turnKind
                  : 'answer',
              roundIndex: Number(payload.roundIndex ?? 0),
              depth: Number(payload.depth ?? 0)
            }),
            updatedAt: entry.createdAt
          }
          break
        }
        case 'message_part_upsert': {
          const record = ensureAssistantMessage(entry.createdAt)
          const part = payload.part as NormalChatMessagePart | undefined
          if (!part) {
            break
          }
          record.message = {
            ...record.message,
            parts:
              part.kind === 'functioncall'
                ? upsertFunctionCallPart(record.message.parts, part)
                : part.kind === 'thinking'
                  ? upsertThinkingPart(record.message.parts, part)
                  : part.kind === 'subagent'
                    ? upsertSubAgentPart(record.message.parts, part)
                    : record.message.parts,
            updatedAt: entry.createdAt
          }
          break
        }
        case 'model_call_created': {
          modelCalls.set(
            entry.entityId,
            createEmptyModelCall(
              input.head,
              input.requestId,
              entry.entityId,
              payload,
              entry.createdAt
            )
          )
          break
        }
        case 'prompt_compiled': {
          const existing = modelCalls.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.compiledPromptJson = {
            systemSections: (payload.systemSections ??
              {}) as NormalChatPromptSnapshot['systemSections'],
            roundSections: (payload.roundSections ??
              {}) as NormalChatPromptSnapshot['roundSections'],
            compiledSystemPrompt: String(payload.compiledSystemPrompt ?? ''),
            compiledRoundPrompt: String(payload.compiledRoundPrompt ?? ''),
            trimSnapshot: (payload.trimSnapshot ?? null) as NormalChatPromptSnapshot['trimSnapshot']
          }
          existing.compiledPromptMarkdown = String(payload.compiledPromptMarkdown ?? '')
          existing.historyMessagesJson = JSON.stringify(payload.historyMessages ?? [])
          existing.loadedActionsJson = JSON.stringify(payload.loadedActions ?? [])
          existing.actionResultsJson = JSON.stringify(payload.actionResults ?? [])
          existing.updatedAt = entry.createdAt
          modelCalls.set(entry.entityId, existing)
          break
        }
        case 'model_call_raw_delta': {
          const existing = modelCalls.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.responseStreamText = `${existing.responseStreamText ?? ''}${String(payload.delta ?? '')}`
          existing.updatedAt = entry.createdAt
          modelCalls.set(entry.entityId, existing)
          break
        }
        case 'response_parsed': {
          const existing = modelCalls.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.responseEnvelopeJson = JSON.stringify(payload.responseEnvelope ?? null)
          existing.updatedAt = entry.createdAt
          modelCalls.set(entry.entityId, existing)
          break
        }
        case 'provider_request_captured': {
          const existing = modelCalls.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.rawProviderRequest = {
            id: String(payload.id ?? ''),
            capturedAt: String(payload.capturedAt ?? entry.createdAt),
            requestId: String(payload.requestId ?? input.requestId),
            modelCallId: String(payload.modelCallId ?? entry.entityId),
            protocol: String(payload.protocol ?? '') as NormalChatCapturedProviderRequestSnapshot['protocol'],
            providerId: String(payload.providerId ?? ''),
            modelId: String(payload.modelId ?? ''),
            streaming: Boolean(payload.streaming),
            method: String(payload.method ?? ''),
            url: String(payload.url ?? ''),
            headers:
              payload.headers && typeof payload.headers === 'object'
                ? (payload.headers as Record<string, string>)
                : {},
            bodyText: typeof payload.bodyText === 'string' ? payload.bodyText : null,
            bodyJson: payload.bodyJson ?? null
          }
          existing.updatedAt = entry.createdAt
          modelCalls.set(entry.entityId, existing)
          break
        }
        case 'model_call_finished': {
          const existing = modelCalls.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.status = 'succeeded'
          existing.finalReplyMd = String(payload.finalReplyMd ?? '')
          existing.responseStreamText = String(
            payload.responseStreamText ?? existing.responseStreamText ?? ''
          )
          existing.turnKind =
            payload.turnKind === 'action_plan' || payload.turnKind === 'post_action_synthesis'
              ? payload.turnKind
              : 'answer'
          existing.producedActionCount = Number(
            payload.producedActionCount ?? existing.producedActionCount
          )
          existing.consumedActionRunIds = Array.isArray(payload.consumedActionRunIds)
            ? payload.consumedActionRunIds.map((value) => String(value))
            : existing.consumedActionRunIds
          existing.synthesisRequired = Boolean(payload.synthesisRequired)
          existing.finishedAt = entry.createdAt
          existing.updatedAt = entry.createdAt
          modelCalls.set(entry.entityId, existing)
          break
        }
        case 'model_call_failed': {
          const existing = modelCalls.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.status = 'failed'
          existing.errorMessage = String(payload.errorMessage ?? '')
          existing.responseStreamText = String(
            payload.responseStreamText ?? existing.responseStreamText ?? ''
          )
          existing.finishedAt = entry.createdAt
          existing.updatedAt = entry.createdAt
          modelCalls.set(entry.entityId, existing)
          break
        }
        case 'action_run_created': {
          actionRuns.set(entry.entityId, {
            id: entry.entityId,
            taskId: input.requestId,
            agentRunId: String(payload.agentRunId ?? ''),
            actionKey: String(payload.actionKey ?? ''),
            actionKind: String(payload.actionKind ?? ''),
            mode: typeof payload.mode === 'string' ? payload.mode : null,
            status: 'queued',
            roundIndex: Number(payload.roundIndex ?? 0),
            batchIndex: Number(payload.batchIndex ?? 0),
            parallelIndex: Number(payload.parallelIndex ?? 0),
            inputJson: String(payload.inputJson ?? '{}'),
            outputJson: null,
            errorMessage: null,
            createdAt: entry.createdAt,
            startedAt: null,
            finishedAt: null,
            updatedAt: entry.createdAt
          })
          break
        }
        case 'action_status': {
          const existing = actionRuns.get(entry.entityId)
          if (!existing) {
            break
          }
          const statusValue = String(payload.status ?? '')
          existing.status =
            statusValue === 'running'
              ? 'running'
              : statusValue === 'success' || statusValue === 'succeeded'
                ? 'succeeded'
                : statusValue === 'aborted'
                  ? 'aborted'
                  : existing.status
          existing.errorMessage =
            existing.status === 'failed'
              ? String(payload.message ?? existing.errorMessage ?? '')
              : existing.errorMessage
          existing.startedAt = existing.startedAt ?? entry.createdAt
          existing.updatedAt = entry.createdAt
          actionRuns.set(entry.entityId, existing)
          break
        }
        case 'action_run_finished': {
          const existing = actionRuns.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.status = 'succeeded'
          existing.outputJson = String(payload.outputJson ?? existing.outputJson ?? '')
          existing.finishedAt = entry.createdAt
          existing.updatedAt = entry.createdAt
          actionRuns.set(entry.entityId, existing)
          break
        }
        case 'action_run_failed': {
          const existing = actionRuns.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.status = 'failed'
          existing.errorMessage = String(payload.errorMessage ?? '')
          existing.finishedAt = entry.createdAt
          existing.updatedAt = entry.createdAt
          actionRuns.set(entry.entityId, existing)
          break
        }
        case 'agent_run_created': {
          agentRuns.set(entry.entityId, {
            id: entry.entityId,
            taskId: input.requestId,
            parentAgentRunId:
              typeof payload.parentAgentRunId === 'string' ? payload.parentAgentRunId : null,
            depth: Number(payload.depth ?? 0),
            roleKind: String(payload.roleKind ?? ''),
            templateId: String(payload.templateId ?? ''),
            goal: String(payload.goal ?? ''),
            status: 'queued',
            reactCount: 0,
            maxReactSteps: Number(payload.maxReactSteps ?? 0),
            maxChildDepth: Number(payload.maxChildDepth ?? 0),
            modelProviderId:
              typeof payload.modelProviderId === 'string' ? payload.modelProviderId : null,
            modelId: typeof payload.modelId === 'string' ? payload.modelId : null,
            finalText: null,
            errorMessage: null,
            createdAt: entry.createdAt,
            startedAt: null,
            finishedAt: null,
            updatedAt: entry.createdAt
          })
          break
        }
        case 'agent_status': {
          const existing = agentRuns.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.status = String(
            payload.status ?? existing.status
          ) as NormalChatAgentRunSnapshot['status']
          existing.startedAt = existing.startedAt ?? entry.createdAt
          existing.updatedAt = entry.createdAt
          agentRuns.set(entry.entityId, existing)
          break
        }
        case 'agent_run_finished': {
          const existing = agentRuns.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.status = 'succeeded'
          existing.finalText = String(payload.finalText ?? '')
          existing.reactCount = Number(payload.reactCount ?? existing.reactCount)
          existing.finishedAt = entry.createdAt
          existing.updatedAt = entry.createdAt
          agentRuns.set(entry.entityId, existing)
          break
        }
        case 'agent_run_failed': {
          const existing = agentRuns.get(entry.entityId)
          if (!existing) {
            break
          }
          existing.status = 'failed'
          existing.errorMessage = String(payload.errorMessage ?? '')
          existing.reactCount = Number(payload.reactCount ?? existing.reactCount)
          existing.finishedAt = entry.createdAt
          existing.updatedAt = entry.createdAt
          agentRuns.set(entry.entityId, existing)
          break
        }
        case 'request_finished': {
          finalResponse = {
            chunks: [],
            finalText: extractFinalText(
              Array.from(messages.values()).map((record) => record.message)
            ),
            aborted: input.head?.status === 'aborted',
            errorMessage: null,
            completedAt: entry.createdAt,
            assistantMessageId:
              typeof payload.assistantMessageId === 'string' ? payload.assistantMessageId : null
          }
          break
        }
        case 'request_failed': {
          finalResponse = {
            chunks: [],
            finalText: extractFinalText(
              Array.from(messages.values()).map((record) => record.message)
            ),
            aborted: false,
            errorMessage: String(payload.message ?? ''),
            completedAt: entry.createdAt,
            assistantMessageId: input.head?.assistantMessageId ?? null
          }
          break
        }
        default:
          break
      }
    }

    const orderedMessages = Array.from(messages.values())
      .map((record) => record.message)
      .sort((left, right) => {
        const byTime = left.createdAt.localeCompare(right.createdAt)
        return byTime !== 0 ? byTime : left.id.localeCompare(right.id)
      })

    if (!finalResponse && input.head?.status === 'succeeded') {
      finalResponse = {
        chunks: [],
        finalText: extractFinalText(orderedMessages),
        aborted: false,
        errorMessage: null,
        completedAt: input.head.finishedAt,
        assistantMessageId: input.head.assistantMessageId
      }
    }

    return {
      head: input.head,
      requestId: input.requestId,
      topicId,
      assistantId,
      assistantName,
      assistantEmoji,
      topicTitle,
      modelProviderId,
      modelId,
      executionSnapshot,
      finalResponse,
      messages: orderedMessages,
      modelCalls: Array.from(modelCalls.values()).sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt)
      ),
      actionRuns: Array.from(actionRuns.values()).sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt)
      ),
      agentRuns: Array.from(agentRuns.values()).sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt)
      )
    }
  }
}
