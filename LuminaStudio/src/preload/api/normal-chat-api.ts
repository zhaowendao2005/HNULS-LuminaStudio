import { ipcRenderer } from 'electron'
import type {
  NormalChatAbortRequest,
  NormalChatAPI,
  NormalChatAssignLabelRequest,
  NormalChatConversationStreamEvent,
  NormalChatCreateLabelRequest,
  NormalChatCreateAssistantRequest,
  NormalChatCreateTopicRequest,
  NormalChatDeleteAssistantRequest,
  NormalChatDeleteConversationTurnRequest,
  NormalChatDeleteLabelRequest,
  NormalChatDeleteTopicRequest,
  NormalChatGetConversationRequest,
  NormalChatGetRequestDebugSnapshotRequest,
  NormalChatGetTopicTranscriptRequest,
  NormalChatRenameLabelRequest,
  NormalChatRenameTopicRequest,
  NormalChatSendMessageRequest,
  NormalChatSetActiveAssistantRequest,
  NormalChatSetActiveTopicRequest,
  NormalChatUpdateAssistantRequest,
  NormalChatUpdateTopicConfigRequest,
  NormalChatUpdateTopicStreamingRequest,
  NormalChatUpdateTopicPromptRequest
} from '../types'

export const normalChatAPI: NormalChatAPI = {
  getBootstrap: () => ipcRenderer.invoke('normalChat:getBootstrap'),
  getConversation: (request: NormalChatGetConversationRequest) =>
    ipcRenderer.invoke('normalChat:getConversation', request),
  getTopicTranscript: (request: NormalChatGetTopicTranscriptRequest) =>
    ipcRenderer.invoke('normalChat:getTopicTranscript', request),
  getRequestDebugSnapshot: (request: NormalChatGetRequestDebugSnapshotRequest) =>
    ipcRenderer.invoke('normalChat:getRequestDebugSnapshot', request),
  sendMessage: (request: NormalChatSendMessageRequest) =>
    ipcRenderer.invoke('normalChat:sendMessage', request),
  deleteConversationTurn: (request: NormalChatDeleteConversationTurnRequest) =>
    ipcRenderer.invoke('normalChat:deleteConversationTurn', request),
  abort: (request: NormalChatAbortRequest) => ipcRenderer.invoke('normalChat:abort', request),
  onStream: (handler: (event: NormalChatConversationStreamEvent) => void) => {
    const listener = (_event: unknown, payload: NormalChatConversationStreamEvent) =>
      handler(payload)
    ipcRenderer.on('normalChat:stream', listener)
    return () => ipcRenderer.off('normalChat:stream', listener)
  },
  onTopicTraceEntry: (topicId, handler) => {
    const channel = `normalChat:topic-trace:${topicId}`
    const listener = (_event: unknown, payload: Parameters<typeof handler>[0]) => handler(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.off(channel, listener)
  },
  onRequestTraceEntry: (requestId, handler) => {
    const channel = `normalChat:request-trace:${requestId}`
    const listener = (_event: unknown, payload: Parameters<typeof handler>[0]) => handler(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.off(channel, listener)
  },
  createAssistant: (request: NormalChatCreateAssistantRequest) =>
    ipcRenderer.invoke('normalChat:createAssistant', request),
  updateAssistant: (request: NormalChatUpdateAssistantRequest) =>
    ipcRenderer.invoke('normalChat:updateAssistant', request),
  assignLabel: (request: NormalChatAssignLabelRequest) =>
    ipcRenderer.invoke('normalChat:assignLabel', request),
  createLabel: (request: NormalChatCreateLabelRequest) =>
    ipcRenderer.invoke('normalChat:createLabel', request),
  renameLabel: (request: NormalChatRenameLabelRequest) =>
    ipcRenderer.invoke('normalChat:renameLabel', request),
  deleteLabel: (request: NormalChatDeleteLabelRequest) =>
    ipcRenderer.invoke('normalChat:deleteLabel', request),
  setActiveAssistant: (request: NormalChatSetActiveAssistantRequest) =>
    ipcRenderer.invoke('normalChat:setActiveAssistant', request),
  deleteAssistant: (request: NormalChatDeleteAssistantRequest) =>
    ipcRenderer.invoke('normalChat:deleteAssistant', request),
  createTopic: (request: NormalChatCreateTopicRequest) =>
    ipcRenderer.invoke('normalChat:createTopic', request),
  renameTopic: (request: NormalChatRenameTopicRequest) =>
    ipcRenderer.invoke('normalChat:renameTopic', request),
  deleteTopic: (request: NormalChatDeleteTopicRequest) =>
    ipcRenderer.invoke('normalChat:deleteTopic', request),
  setActiveTopic: (request: NormalChatSetActiveTopicRequest) =>
    ipcRenderer.invoke('normalChat:setActiveTopic', request),
  updateTopicPrompt: (request: NormalChatUpdateTopicPromptRequest) =>
    ipcRenderer.invoke('normalChat:updateTopicPrompt', request),
  updateTopicStreaming: (request: NormalChatUpdateTopicStreamingRequest) =>
    ipcRenderer.invoke('normalChat:updateTopicStreaming', request),
  updateTopicConfig: (request: NormalChatUpdateTopicConfigRequest) =>
    ipcRenderer.invoke('normalChat:updateTopicConfig', request)
}
