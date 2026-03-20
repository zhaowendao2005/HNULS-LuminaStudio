import { ipcRenderer } from 'electron'
import type {
  NormalChatAPI,
  NormalChatCreateAssistantRequest,
  NormalChatCreateTopicRequest,
  NormalChatDeleteTopicRequest,
  NormalChatRenameTopicRequest,
  NormalChatSetActiveAssistantRequest,
  NormalChatSetActiveTopicRequest,
  NormalChatUpdateAssistantRequest,
  NormalChatUpdateTopicPromptRequest
} from '../types'

export const normalChatAPI: NormalChatAPI = {
  getBootstrap: () => ipcRenderer.invoke('normalChat:getBootstrap'),
  createAssistant: (request: NormalChatCreateAssistantRequest) =>
    ipcRenderer.invoke('normalChat:createAssistant', request),
  updateAssistant: (request: NormalChatUpdateAssistantRequest) =>
    ipcRenderer.invoke('normalChat:updateAssistant', request),
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
