import { ipcRenderer } from 'electron'
import type {
  NormalChatAbortRequest,
  NormalChatAPI,
  NormalChatAssignLabelRequest,
  NormalChatConversationStreamEvent,
  NormalChatCreateLabelRequest,
  NormalChatCreateAssistantRequest,
  NormalChatCreateTopicRequest,
  NormalChatDeleteLabelRequest,
  NormalChatDeleteTopicRequest,
  NormalChatGetConversationRequest,
  NormalChatRenameLabelRequest,
  NormalChatRenameTopicRequest,
  NormalChatSendMessageRequest,
  NormalChatSetActiveAssistantRequest,
  NormalChatSetActiveTopicRequest,
  NormalChatUpdateAssistantRequest,
  NormalChatUpdateTopicPromptRequest
} from '../types'

export const normalChatAPI: NormalChatAPI = {
  getBootstrap: () => ipcRenderer.invoke('normalChat:getBootstrap'),
  getConversation: (request: NormalChatGetConversationRequest) =>
    ipcRenderer.invoke('normalChat:getConversation', request),
  sendMessage: (request: NormalChatSendMessageRequest) =>
    ipcRenderer.invoke('normalChat:sendMessage', request),
  abort: (request: NormalChatAbortRequest) => ipcRenderer.invoke('normalChat:abort', request),
  onStream: (handler: (event: NormalChatConversationStreamEvent) => void) => {
    const listener = (_event: unknown, payload: NormalChatConversationStreamEvent) => handler(payload)
    ipcRenderer.on('normalChat:stream', listener)
    return () => ipcRenderer.off('normalChat:stream', listener)
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
  createTopic: (request: NormalChatCreateTopicRequest) =>
    ipcRenderer.invoke('normalChat:createTopic', request),
  renameTopic: (request: NormalChatRenameTopicRequest) =>
    ipcRenderer.invoke('normalChat:renameTopic', request),
  deleteTopic: (request: NormalChatDeleteTopicRequest) =>
    ipcRenderer.invoke('normalChat:deleteTopic', request),
  setActiveTopic: (request: NormalChatSetActiveTopicRequest) =>
    ipcRenderer.invoke('normalChat:setActiveTopic', request),
  updateTopicPrompt: (request: NormalChatUpdateTopicPromptRequest) =>
    ipcRenderer.invoke('normalChat:updateTopicPrompt', request)
}
