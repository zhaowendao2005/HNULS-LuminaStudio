import type {
  NormalChatConversationTurnDetail,
  NormalChatConversationTurnRequestRecord,
  NormalChatConversationTurnResponseRecord
} from '@preload/types'
import { chatDetailShellMockApi } from './chat-detail-shell.mock'
import type { ChatDetailShellRecord, ChatDetailShellSnapshot } from './chat-detail-shell.types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'Normal chat detail shell request failed')
  }

  return response.data as T
}

function buildPrimaryCallRequestPayload(
  requestRecord: NormalChatConversationTurnRequestRecord | null
): Record<string, unknown> {
  if (!requestRecord) {
    return {}
  }

  return {
    providerId: requestRecord.providerId,
    modelId: requestRecord.modelId,
    streamingEnabled: requestRecord.streamingEnabled,
    input: requestRecord.input,
    effectiveSystemPrompt: requestRecord.effectiveSystemPrompt,
    promptMessages: requestRecord.promptMessages
  }
}

function buildPrimaryCallResponsePayload(
  responseRecord: NormalChatConversationTurnResponseRecord | null,
  finalMessageText: string,
  metrics: Record<string, unknown> | null
): Record<string, unknown> {
  return {
    finalText: responseRecord?.finalText || finalMessageText,
    chunks: responseRecord?.chunks ?? [],
    aborted: responseRecord?.aborted ?? false,
    errorMessage: responseRecord?.errorMessage ?? null,
    completedAt: responseRecord?.completedAt ?? null,
    metrics
  }
}

function buildPrimaryCallSummary(detail: NormalChatConversationTurnDetail): string {
  const promptCount = detail.requestRecord?.promptMessages.length ?? 0
  const modelName = detail.runtimeTrace?.metrics?.modelName || detail.requestRecord?.modelId || '--'
  return `Prompt ${promptCount} messages / model ${modelName}`
}

function buildPrimaryCallStatus(detail: NormalChatConversationTurnDetail): {
  statusLabel: string
  statusClass: string
} {
  if (detail.responseRecord?.aborted) {
    return {
      statusLabel: 'Aborted',
      statusClass: 'bg-amber-100 text-amber-700'
    }
  }

  if (detail.responseRecord?.errorMessage) {
    return {
      statusLabel: 'Error',
      statusClass: 'bg-rose-100 text-rose-700'
    }
  }

  return {
    statusLabel: 'Completed',
    statusClass: 'bg-emerald-100 text-emerald-700'
  }
}

function toRecord(detail: NormalChatConversationTurnDetail): ChatDetailShellRecord {
  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null
  const finalMessageText = assistantMessage?.parts
    .filter((part) => part.kind === 'text')
    .map((part) => part.text)
    .join('')
    .trim()
  const primaryStatus = buildPrimaryCallStatus(detail)

  return {
    requestId: detail.requestId,
    messageId: assistantMessage?.id ?? '',
    assistantName: detail.assistantName,
    topicTitle: detail.topicTitle,
    description:
      detail.responseRecord?.finalText ||
      finalMessageText ||
      'Conversation detail loaded from backend.',
    calls: [
      {
        id: 'primary-llm-call',
        indexLabel: '#1',
        title: 'Primary LLM Call',
        summary: buildPrimaryCallSummary(detail),
        contextText: `${detail.topicTitle} / ${detail.requestId}`,
        badge: 'LLM',
        statusLabel: primaryStatus.statusLabel,
        statusClass: primaryStatus.statusClass,
        requestPayload: buildPrimaryCallRequestPayload(detail.requestRecord),
        responsePayload: buildPrimaryCallResponsePayload(
          detail.responseRecord,
          finalMessageText || '',
          (detail.runtimeTrace?.metrics as Record<string, unknown> | null) ?? null
        )
      }
    ]
  }
}

export class ChatDetailShellDatasource {
  async loadSnapshot(): Promise<ChatDetailShellSnapshot> {
    return chatDetailShellMockApi.createSnapshot()
  }

  async getConversationDetail(requestId: string): Promise<ChatDetailShellRecord> {
    if (!requestId) {
      return chatDetailShellMockApi.getConversationDetail('')
    }

    const detail = await window.api.normalChat
      .getConversationTurnDetail({ requestId })
      .then(unwrap)
      .catch(() => null)

    if (!detail) {
      return chatDetailShellMockApi.getConversationDetail(requestId)
    }

    return toRecord(detail)
  }
}
