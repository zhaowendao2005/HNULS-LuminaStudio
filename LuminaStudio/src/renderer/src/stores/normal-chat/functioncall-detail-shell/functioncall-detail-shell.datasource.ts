import type {
  NormalChatConversationTurnDetail,
  NormalChatFunctionCallMessagePart
} from '@preload/types'
import { functioncallDetailShellMockApi } from './functioncall-detail-shell.mock'
import type {
  FunctioncallDetailShellCallItem,
  FunctioncallDetailShellRecord,
  FunctioncallDetailShellSnapshot
} from './functioncall-detail-shell.types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'Normal chat functioncall detail request failed')
  }

  return response.data as T
}

function formatStatusLabel(status: NormalChatFunctionCallMessagePart['status']): string {
  if (status === 'success') return 'Completed'
  if (status === 'error') return 'Error'
  if (status === 'aborted') return 'Aborted'
  if (status === 'queued') return 'Queued'
  return 'Running'
}

function formatStatusClass(status: NormalChatFunctionCallMessagePart['status']): string {
  if (status === 'success') return 'bg-emerald-100 text-emerald-700'
  if (status === 'error') return 'bg-rose-100 text-rose-700'
  if (status === 'aborted') return 'bg-amber-100 text-amber-700'
  if (status === 'queued') return 'bg-slate-100 text-slate-600'
  return 'bg-sky-100 text-sky-700'
}

function toCallItem(
  part: NormalChatFunctionCallMessagePart,
  index: number
): FunctioncallDetailShellCallItem {
  return {
    id: part.callId,
    indexLabel: `#${index + 1}`,
    title: part.title,
    summary: part.decisionReason || `${part.functionCallName} / round ${part.roundIndex}`,
    contextText: `Round ${part.roundIndex} / batch ${part.batchIndex + 1} / parallel ${part.parallelIndex + 1}`,
    badge: part.functionCallName,
    statusLabel: formatStatusLabel(part.status),
    statusClass: formatStatusClass(part.status),
    requestPayload: {
      functionCallName: part.functionCallName,
      input: part.input,
      decisionReason: part.decisionReason,
      roundIndex: part.roundIndex,
      batchIndex: part.batchIndex,
      parallelIndex: part.parallelIndex,
      depth: part.depth
    },
    responsePayload: {
      output: part.output,
      errorMessage: part.errorMessage,
      isStreaming: part.isStreaming,
      status: part.status
    },
    part
  }
}

function toRecord(detail: NormalChatConversationTurnDetail): FunctioncallDetailShellRecord {
  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null
  const functionCalls =
    assistantMessage?.parts.filter(
      (part): part is NormalChatFunctionCallMessagePart => part.kind === 'functioncall'
    ) ?? []

  return {
    requestId: detail.requestId,
    messageId: assistantMessage?.id ?? '',
    assistantName: detail.assistantName,
    topicTitle: detail.topicTitle,
    description:
      functionCalls.length > 0
        ? `Found ${functionCalls.length} functioncall record(s) in this assistant turn.`
        : 'No functioncalls were emitted in this assistant turn.',
    calls: functionCalls.map((part, index) => toCallItem(part, index))
  }
}

export class FunctioncallDetailShellDatasource {
  async loadSnapshot(): Promise<FunctioncallDetailShellSnapshot> {
    return functioncallDetailShellMockApi.createSnapshot()
  }

  async getConversationDetail(requestId: string): Promise<FunctioncallDetailShellRecord> {
    if (!requestId) {
      return functioncallDetailShellMockApi.getConversationDetail('')
    }

    const detail = await window.api.normalChat
      .getConversationTurnDetail({ requestId })
      .then(unwrap)
      .catch(() => null)

    if (!detail) {
      return functioncallDetailShellMockApi.getConversationDetail(requestId)
    }

    return toRecord(detail)
  }
}
