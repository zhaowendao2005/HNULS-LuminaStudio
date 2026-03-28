import type {
  NormalChatConversationDevDetailMockId,
  NormalChatFunctionCallMessagePart
} from '@preload/types'
import { getNormalChatConversationDevDetailMockIdByRequestId } from '../conversation/conversation.mock'
import type {
  FunctioncallDetailShellCallItem,
  FunctioncallDetailShellRecord,
  FunctioncallDetailShellSnapshot
} from './functioncall-detail-shell.types'

function createPart(
  input: Partial<NormalChatFunctionCallMessagePart> & {
    callId: string
    functionCallName: string
    title: string
  }
): NormalChatFunctionCallMessagePart {
  return {
    kind: 'functioncall',
    callId: input.callId,
    functionCallName: input.functionCallName,
    title: input.title,
    status: input.status ?? 'success',
    input: input.input ?? '',
    output: input.output ?? '',
    errorMessage: input.errorMessage ?? null,
    isStreaming: input.isStreaming ?? false,
    roundIndex: input.roundIndex ?? 1,
    batchIndex: input.batchIndex ?? 0,
    parallelIndex: input.parallelIndex ?? 0,
    depth: input.depth ?? 0,
    decisionReason: input.decisionReason ?? null
  }
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

function createRecord(
  requestId: string,
  messageId: string,
  topicTitle: string,
  description: string,
  parts: NormalChatFunctionCallMessagePart[]
): FunctioncallDetailShellRecord {
  return {
    requestId,
    messageId,
    assistantName: 'Dev Mock Assistant',
    topicTitle,
    description,
    calls: parts.map((part, index) => toCallItem(part, index))
  }
}

const detailRecords: Record<NormalChatConversationDevDetailMockId, FunctioncallDetailShellRecord> =
  {
    'detail-streaming-baseline': createRecord(
      'detail-request-streaming-baseline',
      'detail-message-streaming-baseline',
      'Streaming Baseline',
      'No functioncalls in this turn.',
      []
    ),
    'detail-functioncall-matrix': createRecord(
      'detail-request-functioncall-matrix',
      'detail-message-functioncall-matrix',
      'FunctionCall Matrix',
      'Dedicated functioncall detail mock with mixed statuses.',
      [
        createPart({
          callId: 'queued-search',
          functionCallName: 'pubmedSearch',
          title: 'Queued literature search',
          status: 'queued',
          input: '{"query":"cell signaling review","limit":5}',
          isStreaming: true,
          decisionReason:
            'Queue the broad search while the main planner is still collecting constraints.'
        }),
        createPart({
          callId: 'success-search',
          functionCallName: 'pubmedSearch',
          title: 'Evidence search',
          status: 'success',
          input: '{"query":"MAPK signaling review","limit":5}',
          output: '{"hits":["Paper A","Paper B"]}',
          parallelIndex: 1,
          decisionReason: 'Collect literature for the first evidence batch.'
        }),
        createPart({
          callId: 'error-reference',
          functionCallName: 'knowledgeSearch',
          title: 'Reference retrieval',
          status: 'error',
          input: '{"query":"ERK pathway biomarkers"}',
          errorMessage: 'Reference backend timed out while collecting full text.',
          parallelIndex: 2,
          decisionReason: 'Fetch supporting references for citations.'
        }),
        createPart({
          callId: 'aborted-cross-check',
          functionCallName: 'crossCheck',
          title: 'Cross-check follow-up',
          status: 'aborted',
          input: '{"paperId":"Paper A"}',
          errorMessage: 'Follow-up was interrupted after enough evidence had been collected.',
          batchIndex: 1,
          decisionReason: 'Run a second pass only if the first batch leaves conflicts.'
        })
      ]
    ),
    'detail-agent-hierarchy': createRecord(
      'detail-request-agent-hierarchy',
      'detail-message-agent-hierarchy',
      'Agent Hierarchy',
      'Agent workflows may still emit direct helper calls.',
      [
        createPart({
          callId: 'worker-search',
          functionCallName: 'search-helper',
          title: 'Worker evidence collection',
          status: 'success',
          input: '{"query":"signal transduction review"}',
          output: '{"hits":3}',
          decisionReason: 'Delegate evidence collection to the worker branch.'
        })
      ]
    ),
    'detail-request-interrupt': createRecord(
      'detail-request-interrupt',
      'detail-message-interrupt',
      'Interrupt And Error',
      'Interrupted tool execution remains inspectable.',
      [
        createPart({
          callId: 'long-running-search',
          functionCallName: 'deepSearch',
          title: 'Long-running deep search',
          status: 'running',
          input: '{"query":"very long task"}',
          isStreaming: true,
          decisionReason: 'Continue expanding the deep search until interrupted.'
        })
      ]
    )
  }

function cloneRecord(record: FunctioncallDetailShellRecord): FunctioncallDetailShellRecord {
  return structuredClone(record)
}

function resolveRecordByRequestId(requestId: string): FunctioncallDetailShellRecord {
  const detailMockId = getNormalChatConversationDevDetailMockIdByRequestId(requestId)
  if (detailMockId && detailRecords[detailMockId]) {
    return cloneRecord({
      ...detailRecords[detailMockId],
      requestId
    })
  }

  return cloneRecord(detailRecords['detail-functioncall-matrix'])
}

export const functioncallDetailShellMock: FunctioncallDetailShellSnapshot = {
  visible: false,
  requestId: 'detail-request-functioncall-matrix',
  messageId: 'detail-message-functioncall-matrix',
  currentPage: 'overview',
  selectedCallId: '',
  requestViewMode: 'json',
  responseViewMode: 'json',
  loading: false,
  errorText: '',
  detailByRequestId: {
    'detail-request-functioncall-matrix': cloneRecord(detailRecords['detail-functioncall-matrix'])
  }
}

export const functioncallDetailShellMockApi = {
  createSnapshot(): FunctioncallDetailShellSnapshot {
    return structuredClone(functioncallDetailShellMock)
  },
  async getConversationDetail(requestId: string): Promise<FunctioncallDetailShellRecord> {
    return resolveRecordByRequestId(requestId)
  }
}
