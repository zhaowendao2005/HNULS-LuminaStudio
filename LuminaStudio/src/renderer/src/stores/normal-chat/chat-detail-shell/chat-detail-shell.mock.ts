import type { NormalChatConversationDevDetailMockId } from '@preload/types'
import { getNormalChatConversationDevDetailMockIdByRequestId } from '../conversation/conversation.mock'
import type { ChatDetailShellRecord, ChatDetailShellSnapshot } from './chat-detail-shell.types'

export const chatDetailShellMockRequestId = 'detail-request-streaming-baseline'
export const chatDetailShellMockMessageId = 'detail-message-streaming-baseline'

function createCall(
  input: Omit<ChatDetailShellRecord['calls'][number], 'indexLabel'> & { index: number }
): ChatDetailShellRecord['calls'][number] {
  return {
    ...input,
    indexLabel: `#${input.index}`
  }
}

const detailRecords: Record<NormalChatConversationDevDetailMockId, ChatDetailShellRecord> = {
  'detail-streaming-baseline': {
    requestId: chatDetailShellMockRequestId,
    messageId: chatDetailShellMockMessageId,
    assistantName: 'Dev Mock Assistant',
    topicTitle: 'Streaming Baseline',
    description: 'Primary request and response payload for the current LLM turn.',
    calls: [
      createCall({
        index: 1,
        id: 'primary-llm-call',
        title: 'Primary LLM Call',
        summary: 'One request and one response with no tools.',
        contextText: 'Streaming Baseline / primary-llm-call',
        badge: 'LLM',
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
          chunks: [
            'This frontend dev playback exercises the normal streaming path.',
            ' Use it to validate message layout, pending state, token metrics, and final commit behavior.'
          ],
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
    description: 'Primary LLM call remains visible even when tool calls exist.',
    calls: [
      createCall({
        index: 1,
        id: 'primary-llm-call',
        title: 'Primary LLM Call',
        summary: 'The assistant orchestrates tool batches around one main model turn.',
        contextText: 'FunctionCall Matrix / primary-llm-call',
        badge: 'LLM',
        statusLabel: 'Completed',
        statusClass: 'bg-emerald-100 text-emerald-700',
        requestPayload: {
          providerId: 'openai',
          modelId: 'gpt-4.1',
          streamingEnabled: true,
          input: 'Collect evidence and summarize the MAPK signaling pathway with references.'
        },
        responsePayload: {
          finalText:
            'I collected evidence in two tool batches and summarized the main MAPK pathway checkpoints.',
          chunks: [
            'I collected evidence in two tool batches.',
            ' I summarized the main MAPK pathway checkpoints.'
          ],
          aborted: false,
          errorMessage: null
        }
      })
    ]
  },
  'detail-agent-hierarchy': {
    requestId: 'detail-request-agent-hierarchy',
    messageId: 'detail-message-agent-hierarchy',
    assistantName: 'Dev Mock Assistant',
    topicTitle: 'Agent Hierarchy',
    description: 'Agent orchestration still maps to one primary request-response pair.',
    calls: [
      createCall({
        index: 1,
        id: 'primary-llm-call',
        title: 'Primary LLM Call',
        summary: 'A director-agent response with runtime tree metadata.',
        contextText: 'Agent Hierarchy / primary-llm-call',
        badge: 'LLM',
        statusLabel: 'Completed',
        statusClass: 'bg-emerald-100 text-emerald-700',
        requestPayload: {
          providerId: 'openai',
          modelId: 'gpt-4.1',
          streamingEnabled: true,
          input: 'Plan a multi-agent evidence collection workflow for signal transduction review.'
        },
        responsePayload: {
          finalText:
            'The director dispatched worker and repair branches, then merged the final summary.',
          chunks: [
            'The director dispatched worker and repair branches.',
            ' Then it merged the final summary.'
          ],
          aborted: false,
          errorMessage: null
        }
      })
    ]
  },
  'detail-request-interrupt': {
    requestId: 'detail-request-interrupt',
    messageId: 'detail-message-interrupt',
    assistantName: 'Dev Mock Assistant',
    topicTitle: 'Interrupt And Error',
    description: 'Interrupted requests still keep a primary call row.',
    calls: [
      createCall({
        index: 1,
        id: 'primary-llm-call',
        title: 'Primary LLM Call',
        summary: 'Interrupted before a final answer committed.',
        contextText: 'Interrupt And Error / primary-llm-call',
        badge: 'LLM',
        statusLabel: 'Aborted',
        statusClass: 'bg-amber-100 text-amber-700',
        requestPayload: {
          providerId: 'openai',
          modelId: 'gpt-4.1',
          streamingEnabled: true,
          input: 'Run a deep multi-step search and stop halfway.'
        },
        responsePayload: {
          finalText: '',
          chunks: [],
          aborted: true,
          errorMessage:
            'The request was interrupted before the final assistant message was committed.'
        }
      })
    ]
  }
}

function cloneRecord(record: ChatDetailShellRecord): ChatDetailShellRecord {
  return structuredClone(record)
}

function resolveRecordByRequestId(requestId: string): ChatDetailShellRecord {
  const detailMockId = getNormalChatConversationDevDetailMockIdByRequestId(requestId)
  if (detailMockId && detailRecords[detailMockId]) {
    return cloneRecord({
      ...detailRecords[detailMockId],
      requestId
    })
  }

  return cloneRecord(detailRecords['detail-streaming-baseline'])
}

export const chatDetailShellMock: ChatDetailShellSnapshot = {
  visible: false,
  requestId: chatDetailShellMockRequestId,
  messageId: chatDetailShellMockMessageId,
  currentPage: 'overview',
  selectedCallId: '',
  requestViewMode: 'json',
  responseViewMode: 'json',
  loading: false,
  errorText: '',
  detailByRequestId: {
    [chatDetailShellMockRequestId]: cloneRecord(detailRecords['detail-streaming-baseline'])
  }
}

export const chatDetailShellMockApi = {
  createSnapshot(): ChatDetailShellSnapshot {
    return structuredClone(chatDetailShellMock)
  },
  async getConversationDetail(requestId: string): Promise<ChatDetailShellRecord> {
    return resolveRecordByRequestId(requestId)
  }
}
