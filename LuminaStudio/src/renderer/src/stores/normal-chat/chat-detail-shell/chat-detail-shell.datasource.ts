import type { NormalChatTaskDetail, NormalChatModelCallSnapshot } from '@preload/types'
import type { ChatDetailShellRecord, ChatDetailShellSnapshot } from './chat-detail-shell.types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'Normal chat detail shell request failed')
  }

  return response.data as T
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function createEmptySnapshot(): ChatDetailShellSnapshot {
  return {
    visible: false,
    requestId: '',
    messageId: '',
    currentPage: 'overview',
    selectedCallId: '',
    requestViewMode: 'json',
    responseViewMode: 'json',
    loading: false,
    errorText: '',
    detailByRequestId: {}
  }
}

function buildCallStatus(modelCall: NormalChatModelCallSnapshot): {
  statusLabel: string
  statusClass: string
} {
  switch (modelCall.status) {
    case 'queued':
      return { statusLabel: 'Queued', statusClass: 'bg-slate-100 text-slate-600' }
    case 'running':
      return { statusLabel: 'Running', statusClass: 'bg-sky-100 text-sky-700' }
    case 'failed':
      return { statusLabel: 'Error', statusClass: 'bg-rose-100 text-rose-700' }
    case 'aborted':
      return { statusLabel: 'Aborted', statusClass: 'bg-amber-100 text-amber-700' }
    case 'succeeded':
    default:
      return { statusLabel: 'Completed', statusClass: 'bg-emerald-100 text-emerald-700' }
  }
}

function buildCallTitle(modelCall: NormalChatModelCallSnapshot): string {
  return modelCall.depth > 0
    ? `Nested Model Call #${modelCall.seq}`
    : `Model Call #${modelCall.seq}`
}

function buildCallSummary(modelCall: NormalChatModelCallSnapshot): string {
  const requestPayload = parseJson<Record<string, unknown>>(modelCall.requestPayloadJson, {})
  const providerId =
    typeof requestPayload.providerId === 'string' ? requestPayload.providerId : 'unknown-provider'
  const modelId =
    typeof requestPayload.modelId === 'string' ? requestPayload.modelId : 'unknown-model'
  const loadedActions = parseJson<unknown[]>(modelCall.loadedActionsJson, [])

  return `Round ${modelCall.roundIndex + 1} / depth ${modelCall.depth} / ${providerId} / ${modelId} / actions ${loadedActions.length}`
}

function buildCallContextText(
  detail: NormalChatTaskDetail,
  modelCall: NormalChatModelCallSnapshot
): string {
  const segments = [
    detail.topicTitle,
    `request ${detail.requestId}`,
    `round ${modelCall.roundIndex + 1}`
  ]
  if (modelCall.parentActionRunId) {
    segments.push(`action ${modelCall.parentActionRunId}`)
  }
  return segments.join(' / ')
}

function buildCallBadge(modelCall: NormalChatModelCallSnapshot): string {
  return modelCall.depth > 0 ? `Depth ${modelCall.depth}` : 'LLM'
}

function buildCallRequestPayload(modelCall: NormalChatModelCallSnapshot): Record<string, unknown> {
  return {
    requestPayload: parseJson<Record<string, unknown>>(modelCall.requestPayloadJson, {}),
    compiledPrompt: modelCall.compiledPromptJson,
    compiledPromptMarkdown: modelCall.compiledPromptMarkdown,
    historyMessages: parseJson<unknown[]>(modelCall.historyMessagesJson, []),
    loadedActions: parseJson<unknown[]>(modelCall.loadedActionsJson, []),
    actionResults: parseJson<unknown[]>(modelCall.actionResultsJson, []),
    requestMeta: {
      seq: modelCall.seq,
      taskId: modelCall.taskId,
      conversationId: modelCall.conversationId,
      agentRunId: modelCall.agentRunId,
      parentActionRunId: modelCall.parentActionRunId,
      depth: modelCall.depth,
      roundIndex: modelCall.roundIndex,
      callIndexInAgent: modelCall.callIndexInAgent,
      status: modelCall.status,
      createdAt: modelCall.createdAt,
      startedAt: modelCall.startedAt,
      updatedAt: modelCall.updatedAt
    }
  }
}

function buildCallResponsePayload(modelCall: NormalChatModelCallSnapshot): Record<string, unknown> {
  return {
    responseStreamText: modelCall.responseStreamText,
    errorMessage: modelCall.errorMessage,
    finishedAt: modelCall.finishedAt,
    updatedAt: modelCall.updatedAt
  }
}

function buildDescription(detail: NormalChatTaskDetail): string {
  const lastCompletedCall = [...detail.modelCalls]
    .reverse()
    .find((modelCall) => modelCall.finalReplyMd?.trim())
  if (lastCompletedCall?.finalReplyMd?.trim()) {
    return lastCompletedCall.finalReplyMd.trim()
  }

  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null
  const finalMessageText = assistantMessage?.parts
    .filter((part) => part.kind === 'text')
    .map((part) => part.text)
    .join('')
    .trim()

  return (
    detail.finalResponse?.finalText ||
    finalMessageText ||
    'Conversation detail loaded from backend.'
  )
}

function toRecord(detail: NormalChatTaskDetail): ChatDetailShellRecord {
  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null

  return {
    requestId: detail.requestId,
    messageId: assistantMessage?.id ?? '',
    assistantName: detail.assistantName,
    topicTitle: detail.topicTitle,
    description: buildDescription(detail),
    calls: detail.modelCalls.map((modelCall) => {
      const status = buildCallStatus(modelCall)
      return {
        id: modelCall.id,
        indexLabel: `#${modelCall.seq}`,
        title: buildCallTitle(modelCall),
        summary: buildCallSummary(modelCall),
        contextText: buildCallContextText(detail, modelCall),
        badge: buildCallBadge(modelCall),
        statusLabel: status.statusLabel,
        statusClass: status.statusClass,
        requestPayload: buildCallRequestPayload(modelCall),
        responsePayload: buildCallResponsePayload(modelCall)
      }
    })
  }
}

export class ChatDetailShellDatasource {
  async loadSnapshot(): Promise<ChatDetailShellSnapshot> {
    return createEmptySnapshot()
  }

  async getConversationDetail(requestId: string): Promise<ChatDetailShellRecord> {
    if (!requestId) {
      throw new Error('Missing requestId for chat detail.')
    }

    const detail = await window.api.normalChat.getConversationTurnDetail({ requestId }).then(unwrap)

    if (!detail) {
      throw new Error(`Task detail not found for request ${requestId}.`)
    }

    return toRecord(detail)
  }
}
