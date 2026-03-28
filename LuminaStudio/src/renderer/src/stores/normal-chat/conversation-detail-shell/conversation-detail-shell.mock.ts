import type { NormalChatConversationDevDetailMockId } from '@preload/types'
import { getNormalChatConversationDevDetailMockIdByRequestId } from '../conversation/conversation.mock'
import type {
  ConversationDetailShellRecord,
  ConversationDetailShellSnapshot
} from './conversation-detail-shell.types'

export const conversationDetailShellMockRequestId = 'detail-request-streaming-baseline'
export const conversationDetailShellMockMessageId = 'detail-message-streaming-baseline'

function createCall(
  input: Omit<ConversationDetailShellRecord['calls'][number], 'indexLabel'> & {
    index: number
  }
): ConversationDetailShellRecord['calls'][number] {
  return {
    ...input,
    indexLabel: `#${input.index}`
  }
}

const detailRecords: Record<NormalChatConversationDevDetailMockId, ConversationDetailShellRecord> =
  {
    'detail-streaming-baseline': {
      requestId: conversationDetailShellMockRequestId,
      messageId: conversationDetailShellMockMessageId,
      assistantName: 'Dev Mock Assistant',
      topicTitle: 'Streaming Baseline',
      description: 'Dedicated detail mock for the clean text-only streaming scenario.',
      calls: [
        createCall({
          index: 1,
          id: 'primary-generation',
          title: 'Primary text generation',
          summary: 'One direct model call with no tools and no runtime tree.',
          contextText: 'Streaming Baseline / primary-generation',
          badge: 'Primary',
          statusLabel: 'Completed',
          statusClass: 'bg-emerald-100 text-emerald-700',
          requestPayload: {
            providerId: 'openai',
            modelId: 'gpt-4.1',
            streamingEnabled: true,
            input: 'Explain what this frontend-only chatflow playback is for in one concise answer.'
          },
          responsePayload: {
            finalText:
              'This frontend dev playback exercises the normal streaming path. Use it to validate message layout, pending state, token metrics, and final commit behavior.',
            chunks: 2,
            aborted: false,
            errorMessage: null
          }
        })
      ]
    },
    'detail-functioncall-matrix': {
      requestId: 'detail-request-functioncall-matrix',
      messageId: 'detail-message-functioncall-matrix',
      assistantName: 'Dev Mock Assistant',
      topicTitle: 'FunctionCall Matrix',
      description: 'Dedicated detail mock for multi-batch functioncall rendering.',
      calls: [
        createCall({
          index: 1,
          id: 'queued-search',
          title: 'Queued literature search',
          summary: 'Shows a queued call before execution starts.',
          contextText: 'FunctionCall Matrix / batch 1',
          badge: 'Batch 1',
          statusLabel: 'Queued',
          statusClass: 'bg-slate-100 text-slate-600',
          requestPayload: {
            functionCallName: 'pubmedSearch',
            query: 'cell signaling review',
            limit: 5
          },
          responsePayload: {
            output: '',
            errorMessage: null,
            isStreaming: true
          }
        }),
        createCall({
          index: 2,
          id: 'success-search',
          title: 'Evidence search',
          summary: 'Stable successful call in the first batch.',
          contextText: 'FunctionCall Matrix / batch 1',
          badge: 'Batch 1',
          statusLabel: 'Completed',
          statusClass: 'bg-emerald-100 text-emerald-700',
          requestPayload: {
            functionCallName: 'pubmedSearch',
            query: 'MAPK signaling review',
            limit: 5
          },
          responsePayload: {
            hits: ['Paper A', 'Paper B'],
            errorMessage: null,
            isStreaming: false
          }
        }),
        createCall({
          index: 3,
          id: 'error-reference',
          title: 'Reference retrieval',
          summary: 'Failed call with explicit backend timeout message.',
          contextText: 'FunctionCall Matrix / batch 1',
          badge: 'Batch 1',
          statusLabel: 'Error',
          statusClass: 'bg-rose-100 text-rose-700',
          requestPayload: {
            functionCallName: 'knowledgeSearch',
            query: 'ERK pathway biomarkers'
          },
          responsePayload: {
            output: '',
            errorMessage: 'Reference backend timed out while collecting full text.',
            isStreaming: false
          }
        }),
        createCall({
          index: 4,
          id: 'aborted-cross-check',
          title: 'Cross-check follow-up',
          summary: 'Aborted second-batch call after enough evidence was already collected.',
          contextText: 'FunctionCall Matrix / batch 2',
          badge: 'Batch 2',
          statusLabel: 'Aborted',
          statusClass: 'bg-amber-100 text-amber-700',
          requestPayload: {
            functionCallName: 'crossCheck',
            paperId: 'Paper A'
          },
          responsePayload: {
            output: '',
            errorMessage: 'Follow-up was interrupted after enough evidence had been collected.',
            isStreaming: false
          }
        })
      ]
    },
    'detail-agent-hierarchy': {
      requestId: 'detail-request-agent-hierarchy',
      messageId: 'detail-message-agent-hierarchy',
      assistantName: 'Dev Mock Assistant',
      topicTitle: 'Agent Hierarchy',
      description: 'Dedicated detail mock for multi-level agent orchestration.',
      calls: [
        createCall({
          index: 1,
          id: 'dispatch-root',
          title: 'Dispatch child agents',
          summary: 'Root agent dispatches worker and repair branches.',
          contextText: 'Agent Hierarchy / root',
          badge: 'Director',
          statusLabel: 'Completed',
          statusClass: 'bg-emerald-100 text-emerald-700',
          requestPayload: {
            action: 'dispatchSubAgent',
            workerCount: 2,
            repairEnabled: true
          },
          responsePayload: {
            accepted: true,
            children: ['worker', 'repair']
          }
        }),
        createCall({
          index: 2,
          id: 'worker-search',
          title: 'Worker evidence collection',
          summary: 'Nested worker collects three evidence clusters.',
          contextText: 'Agent Hierarchy / worker',
          badge: 'Worker',
          statusLabel: 'Completed',
          statusClass: 'bg-emerald-100 text-emerald-700',
          requestPayload: {
            helper: 'search-helper',
            query: 'signal transduction review'
          },
          responsePayload: {
            hits: 3,
            resultSummary: 'Search completed with 3 hits.'
          }
        }),
        createCall({
          index: 3,
          id: 'repair-fallback',
          title: 'Repair fallback',
          summary: 'Fallback branch retries once and then produces a safe summary.',
          contextText: 'Agent Hierarchy / repair',
          badge: 'Repair',
          statusLabel: 'Completed',
          statusClass: 'bg-emerald-100 text-emerald-700',
          requestPayload: {
            helper: 'repair-helper',
            strategy: 'fallback-summary'
          },
          responsePayload: {
            mode: 'fallback',
            resultSummary: 'Fallback summary prepared.'
          }
        })
      ]
    },
    'detail-request-interrupt': {
      requestId: 'detail-request-interrupt',
      messageId: 'detail-message-interrupt',
      assistantName: 'Dev Mock Assistant',
      topicTitle: 'Interrupt And Error',
      description: 'Dedicated detail mock for interrupted request cleanup and error state.',
      calls: [
        createCall({
          index: 1,
          id: 'long-running-search',
          title: 'Long-running deep search',
          summary:
            'A running call that never reaches final commit because the request stops early.',
          contextText: 'Interrupt And Error / running',
          badge: 'Interrupt',
          statusLabel: 'Running',
          statusClass: 'bg-sky-100 text-sky-700',
          requestPayload: {
            functionCallName: 'deepSearch',
            query: 'very long task'
          },
          responsePayload: {
            output: '',
            errorMessage:
              'The request was interrupted before a final assistant message was committed.',
            isStreaming: true
          }
        })
      ]
    }
  }

function cloneRecord(record: ConversationDetailShellRecord): ConversationDetailShellRecord {
  return structuredClone(record)
}

function resolveRecordByRequestId(requestId: string): ConversationDetailShellRecord {
  const detailMockId = getNormalChatConversationDevDetailMockIdByRequestId(requestId)
  if (detailMockId && detailRecords[detailMockId]) {
    return cloneRecord({
      ...detailRecords[detailMockId],
      requestId,
      messageId: detailRecords[detailMockId].messageId
    })
  }

  return cloneRecord(detailRecords['detail-streaming-baseline'])
}

export const conversationDetailShellMock: ConversationDetailShellSnapshot = {
  visible: false,
  requestId: conversationDetailShellMockRequestId,
  messageId: conversationDetailShellMockMessageId,
  focusCallId: '',
  currentPage: 'overview',
  selectedCallId: '',
  requestViewMode: 'json',
  responseViewMode: 'json',
  loading: false,
  errorText: '',
  detailByRequestId: {
    [conversationDetailShellMockRequestId]: cloneRecord(detailRecords['detail-streaming-baseline'])
  }
}

export const conversationDetailShellMockApi = {
  createSnapshot(): ConversationDetailShellSnapshot {
    return structuredClone(conversationDetailShellMock)
  },
  async getConversationDetail(requestId: string): Promise<ConversationDetailShellRecord> {
    return resolveRecordByRequestId(requestId)
  }
}
