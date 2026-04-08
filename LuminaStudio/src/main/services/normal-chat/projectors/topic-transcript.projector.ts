import type {
  NormalChatConversationMessage,
  NormalChatFunctionCallMessagePart,
  NormalChatMessagePart,
  NormalChatRequestEntry,
  NormalChatRequestHeadSnapshot,
  NormalChatThinkingMessagePart,
  NormalChatTopicTranscriptSnapshot
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

function createPendingAssistantMessage(
  requestId: string,
  topicId: string,
  createdAt: string
): MessageRecord {
  return {
    traceId: getAssistantTraceMessageId(requestId),
    message: {
      id: getAssistantTraceMessageId(requestId),
      topicId,
      requestId,
      role: 'assistant',
      parts: [],
      createdAt,
      updatedAt: createdAt
    }
  }
}

export class TopicTranscriptProjector {
  project(input: {
    topicId: string
    requestHeads: NormalChatRequestHeadSnapshot[]
    entries: NormalChatRequestEntry[]
  }): NormalChatTopicTranscriptSnapshot {
    const messages = new Map<string, MessageRecord>()
    const headByRequestId = new Map(input.requestHeads.map((head) => [head.requestId, head]))

    const ensureAssistantMessage = (requestId: string, createdAt: string): MessageRecord => {
      const traceId = getAssistantTraceMessageId(requestId)
      const existing = messages.get(traceId)
      if (existing) {
        return existing
      }
      const created = createPendingAssistantMessage(requestId, input.topicId, createdAt)
      messages.set(traceId, created)
      return created
    }

    for (const entry of [...input.entries].sort((left, right) => left.seq - right.seq)) {
      const payload = parsePayload(entry)
      switch (payload.kind) {
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
          const record = ensureAssistantMessage(entry.requestId, entry.createdAt)
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
          const record = ensureAssistantMessage(entry.requestId, entry.createdAt)
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
                  : record.message.parts,
            updatedAt: entry.createdAt
          }
          break
        }
        case 'message_finished': {
          const traceId = entry.entityId
          const record =
            messages.get(traceId) ?? ensureAssistantMessage(entry.requestId, entry.createdAt)
          record.message = {
            ...record.message,
            id: String(payload.messageId ?? record.message.id),
            parts: Array.isArray(payload.parts)
              ? (payload.parts as NormalChatMessagePart[])
              : record.message.parts,
            createdAt: String(payload.createdAt ?? record.message.createdAt),
            updatedAt: String(payload.updatedAt ?? entry.createdAt)
          }
          messages.set(traceId, record)
          break
        }
        case 'message_deleted': {
          messages.delete(entry.entityId)
          break
        }
        default:
          break
      }
    }

    for (const head of input.requestHeads) {
      if (head.topicId !== input.topicId) {
        continue
      }
      if (
        (head.status === 'queued' || head.status === 'running') &&
        !messages.has(getAssistantTraceMessageId(head.requestId))
      ) {
        messages.set(
          getAssistantTraceMessageId(head.requestId),
          createPendingAssistantMessage(head.requestId, head.topicId, head.createdAt)
        )
      }
    }

    const orderedMessages = Array.from(messages.values())
      .map((record) => record.message)
      .filter((message) => {
        const head = headByRequestId.get(message.requestId)
        if (!head) {
          return false
        }
        if (message.role === 'assistant' && message.parts.length === 0) {
          return head.status === 'queued' || head.status === 'running'
        }
        return true
      })
      .sort((left, right) => {
        const byTime = left.createdAt.localeCompare(right.createdAt)
        return byTime !== 0 ? byTime : left.id.localeCompare(right.id)
      })

    return {
      topicId: input.topicId,
      messages: orderedMessages,
      requestHeads: [...input.requestHeads].sort((left, right) => {
        const byTime = left.createdAt.localeCompare(right.createdAt)
        return byTime !== 0 ? byTime : left.requestId.localeCompare(right.requestId)
      }),
      highWatermark: Math.max(0, ...input.entries.map((entry) => entry.seq))
    }
  }
}
