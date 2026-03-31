import type { NormalChatTaskDetail, NormalChatActionRunSnapshot } from '@preload/types'
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

function createEmptySnapshot(): FunctioncallDetailShellSnapshot {
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

function formatStatusLabel(status: NormalChatActionRunSnapshot['status']): string {
  if (status === 'succeeded') return 'Completed'
  if (status === 'failed') return 'Error'
  if (status === 'aborted') return 'Aborted'
  if (status === 'queued') return 'Queued'
  return 'Running'
}

function formatStatusClass(status: NormalChatActionRunSnapshot['status']): string {
  if (status === 'succeeded') return 'bg-emerald-100 text-emerald-700'
  if (status === 'failed') return 'bg-rose-100 text-rose-700'
  if (status === 'aborted') return 'bg-amber-100 text-amber-700'
  if (status === 'queued') return 'bg-slate-100 text-slate-600'
  return 'bg-sky-100 text-sky-700'
}

function toCallItem(
  call: NormalChatActionRunSnapshot,
  index: number
): FunctioncallDetailShellCallItem {
  return {
    id: call.id,
    indexLabel: `#${index + 1}`,
    title: call.actionKey,
    summary: `${call.actionKind} / round ${call.roundIndex}`,
    contextText: `Round ${call.roundIndex} / batch ${call.batchIndex + 1} / parallel ${call.parallelIndex + 1}`,
    badge: call.actionKey,
    statusLabel: formatStatusLabel(call.status),
    statusClass: formatStatusClass(call.status),
    requestPayload: {
      actionKey: call.actionKey,
      actionKind: call.actionKind,
      mode: call.mode,
      inputJson: call.inputJson,
      roundIndex: call.roundIndex,
      batchIndex: call.batchIndex,
      parallelIndex: call.parallelIndex
    },
    responsePayload: {
      outputJson: call.outputJson,
      errorMessage: call.errorMessage,
      status: call.status,
      startedAt: call.startedAt,
      finishedAt: call.finishedAt
    },
    part: {
      kind: 'functioncall',
      callId: call.id,
      functionCallName: call.actionKey,
      title: call.actionKey,
      status:
        call.status === 'succeeded' ? 'success' : call.status === 'failed' ? 'error' : call.status,
      input: call.inputJson,
      output: call.outputJson ?? '',
      errorMessage: call.errorMessage,
      isStreaming: false,
      roundIndex: call.roundIndex,
      batchIndex: call.batchIndex,
      parallelIndex: call.parallelIndex,
      depth: 0,
      decisionReason: null
    }
  }
}

function toRecord(detail: NormalChatTaskDetail): FunctioncallDetailShellRecord {
  const assistantMessage = detail.messages.find((message) => message.role === 'assistant') ?? null

  return {
    requestId: detail.requestId,
    messageId: assistantMessage?.id ?? '',
    assistantName: detail.assistantName,
    topicTitle: detail.topicTitle,
    description:
      detail.actionRuns.length > 0
        ? `Found ${detail.actionRuns.length} functioncall record(s) in this task.`
        : 'No functioncalls were emitted in this task.',
    calls: detail.actionRuns.map((call, index) => toCallItem(call, index))
  }
}

export class FunctioncallDetailShellDatasource {
  async loadSnapshot(): Promise<FunctioncallDetailShellSnapshot> {
    return createEmptySnapshot()
  }

  async getConversationDetail(requestId: string): Promise<FunctioncallDetailShellRecord> {
    if (!requestId) {
      throw new Error('Missing requestId for functioncall detail.')
    }

    const detail = await window.api.normalChat.getConversationTurnDetail({ requestId }).then(unwrap)

    if (!detail) {
      throw new Error(`Task detail not found for request ${requestId}.`)
    }

    return toRecord(detail)
  }
}
