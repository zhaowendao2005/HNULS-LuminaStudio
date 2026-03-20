import type {
  NormalChatBootstrap,
  NormalChatTopicPromptMode,
  NormalChatWorkspaceSnapshot
} from '@preload/types'

function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || 'Normal Chat request failed')
  }
  return response.data
}

export interface NormalChatWorkspaceDatasourceLike {
  getBootstrap(): Promise<NormalChatBootstrap>
  createAssistant(payload: { templateKey: string }): Promise<NormalChatWorkspaceSnapshot>
  updateAssistant(payload: {
    assistantId: string
    name?: string
    defaultSystemPrompt?: string
  }): Promise<NormalChatWorkspaceSnapshot>
  assignLabel(payload: {
    assistantId: string
    labelId: string | null
  }): Promise<NormalChatWorkspaceSnapshot>
  createLabel(payload: { name: string }): Promise<NormalChatWorkspaceSnapshot>
  renameLabel(payload: { labelId: string; name: string }): Promise<NormalChatWorkspaceSnapshot>
  deleteLabel(payload: { labelId: string }): Promise<NormalChatWorkspaceSnapshot>
  setActiveAssistant(payload: { assistantId: string }): Promise<NormalChatWorkspaceSnapshot>
  createTopic(payload: { assistantId: string }): Promise<NormalChatWorkspaceSnapshot>
  renameTopic(payload: {
    assistantId: string
    topicId: string
    title: string
  }): Promise<NormalChatWorkspaceSnapshot>
  deleteTopic(payload: {
    assistantId: string
    topicId: string
  }): Promise<NormalChatWorkspaceSnapshot>
  setActiveTopic(payload: {
    assistantId: string
    topicId: string
  }): Promise<NormalChatWorkspaceSnapshot>
  updateTopicPrompt(payload: {
    assistantId: string
    topicId: string
    mode: NormalChatTopicPromptMode
    promptOverride?: string | null
  }): Promise<NormalChatWorkspaceSnapshot>
}

export const NormalChatWorkspaceDatasource: NormalChatWorkspaceDatasourceLike = {
  getBootstrap() {
    return window.api.normalChat.getBootstrap().then(unwrap)
  },
  createAssistant(payload) {
    return window.api.normalChat.createAssistant(payload).then(unwrap)
  },
  updateAssistant(payload) {
    return window.api.normalChat.updateAssistant(payload).then(unwrap)
  },
  assignLabel(payload) {
    return window.api.normalChat.assignLabel(payload).then(unwrap)
  },
  createLabel(payload) {
    return window.api.normalChat.createLabel(payload).then(unwrap)
  },
  renameLabel(payload) {
    return window.api.normalChat.renameLabel(payload).then(unwrap)
  },
  deleteLabel(payload) {
    return window.api.normalChat.deleteLabel(payload).then(unwrap)
  },
  setActiveAssistant(payload) {
    return window.api.normalChat.setActiveAssistant(payload).then(unwrap)
  },
  createTopic(payload) {
    return window.api.normalChat.createTopic(payload).then(unwrap)
  },
  renameTopic(payload) {
    return window.api.normalChat.renameTopic(payload).then(unwrap)
  },
  deleteTopic(payload) {
    return window.api.normalChat.deleteTopic(payload).then(unwrap)
  },
  setActiveTopic(payload) {
    return window.api.normalChat.setActiveTopic(payload).then(unwrap)
  },
  updateTopicPrompt(payload) {
    return window.api.normalChat.updateTopicPrompt(payload).then(unwrap)
  }
}
