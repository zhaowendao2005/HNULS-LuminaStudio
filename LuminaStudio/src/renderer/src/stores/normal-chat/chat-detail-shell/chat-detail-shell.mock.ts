import type { NormalChatConversationDevDetailMockId } from '@preload/types'
import { getNormalChatConversationDevDetailMockIdByRequestId } from '../conversation/conversation.mock'
import type {
  ChatDetailShellDocGroup,
  ChatDetailShellRecord,
  ChatDetailShellSnapshot
} from './chat-detail-shell.types'

export const chatDetailShellMockRequestId = 'detail-request-streaming-baseline'
export const chatDetailShellMockMessageId = 'detail-message-streaming-baseline'

function createGroups(requestText: string, responseText: string): ChatDetailShellDocGroup[] {
  return [
    {
      id: 'request',
      title: 'request',
      items: [
        {
          id: 'request.request_meta',
          groupId: 'request',
          title: 'request_meta',
          summary: '请求元信息',
          description: '模拟请求侧文档。',
          payload: { input: requestText },
          kind: 'json-object'
        }
      ]
    },
    {
      id: 'response',
      title: 'response',
      items: [
        {
          id: 'response.final_reply',
          groupId: 'response',
          title: 'response.final_reply',
          summary: '最终回答正文',
          description: '模拟响应侧文档。',
          payload: responseText,
          kind: 'markdown'
        }
      ]
    }
  ]
}

function createCall(index: number, requestText: string, responseText: string) {
  return {
    id: `primary-llm-call-${index}`,
    indexLabel: `#${index}`,
    title: index === 1 ? 'Primary LLM Call' : `Model Call #${index}`,
    summary: 'Mock call detail row.',
    contextText: 'Mock Topic / mock-call',
    badge: 'LLM',
    statusLabel: 'Completed',
    statusClass: 'bg-emerald-100 text-emerald-700',
    groups: createGroups(requestText, responseText)
  }
}

const detailRecords: Record<NormalChatConversationDevDetailMockId, ChatDetailShellRecord> = {
  'detail-streaming-baseline': {
    requestId: chatDetailShellMockRequestId,
    messageId: chatDetailShellMockMessageId,
    assistantName: 'Dev Mock Assistant',
    topicTitle: 'Streaming Baseline',
    description: 'Primary request and response payload for the current LLM turn.',
    hasLlmCallDetails: true,
    llmCallEmptyMessage: null,
    calls: [createCall(1, 'Explain this turn.', 'This is the final answer.')],
    functioncalls: []
  },
  'detail-functioncall-matrix': {
    requestId: 'detail-request-functioncall-matrix',
    messageId: 'detail-message-functioncall-matrix',
    assistantName: 'Dev Mock Assistant',
    topicTitle: 'FunctionCall Matrix',
    description: 'Mock functioncall matrix detail.',
    hasLlmCallDetails: true,
    llmCallEmptyMessage: null,
    calls: [createCall(1, 'Collect evidence.', 'Evidence summarized.')],
    functioncalls: []
  },
  'detail-agent-hierarchy': {
    requestId: 'detail-request-agent-hierarchy',
    messageId: 'detail-message-agent-hierarchy',
    assistantName: 'Dev Mock Assistant',
    topicTitle: 'Agent Hierarchy',
    description: 'Mock agent hierarchy detail.',
    hasLlmCallDetails: true,
    llmCallEmptyMessage: null,
    calls: [createCall(1, 'Plan a workflow.', 'Workflow summary.')],
    functioncalls: []
  },
  'detail-request-interrupt': {
    requestId: 'detail-request-interrupt',
    messageId: 'detail-message-interrupt',
    assistantName: 'Dev Mock Assistant',
    topicTitle: 'Interrupt And Error',
    description: 'Mock interrupted request detail.',
    hasLlmCallDetails: true,
    llmCallEmptyMessage: null,
    calls: [createCall(1, 'Run a long task.', 'Interrupted before completion.')],
    functioncalls: []
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
  selectedGroupId: 'request',
  selectedDocId: '',
  requestViewMode: 'json',
  responseViewMode: 'json',
  schemaViewMode: 'json',
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
