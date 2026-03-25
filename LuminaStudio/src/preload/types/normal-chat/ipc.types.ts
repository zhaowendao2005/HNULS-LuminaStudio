import type { ApiResponse } from '../base.types'
import type {
  NormalChatConversationSnapshot,
  NormalChatConversationTurnDetail
} from './conversation.types'
import type { NormalChatConversationStreamEvent } from './runtime.types'
import type {
  NormalChatBootstrap,
  NormalChatWorkspaceSnapshot,
  NormalChatAssignLabelRequest,
  NormalChatCreateAssistantRequest,
  NormalChatCreateLabelRequest,
  NormalChatCreateTopicRequest,
  NormalChatDeleteLabelRequest,
  NormalChatDeleteTopicRequest,
  NormalChatRenameLabelRequest,
  NormalChatRenameTopicRequest,
  NormalChatSetActiveAssistantRequest,
  NormalChatSetActiveTopicRequest,
  NormalChatUpdateAssistantRequest,
  NormalChatUpdateTopicPromptRequest
} from './workspace.types'

export interface NormalChatGetConversationRequest {
  topicId: string
}

export interface NormalChatGetConversationTurnDetailRequest {
  requestId: string
}

export interface NormalChatDeleteConversationTurnRequest {
  requestId: string
}

export interface NormalChatSendMessageRequest {
  topicId: string
  providerId: string
  modelId: string
  input: string
  clientRequestId?: string
}

export interface NormalChatSendMessageAccepted {
  requestId: string
  message: NormalChatConversationSnapshot['messages'][number]
}

export interface NormalChatAbortRequest {
  requestId: string
}

export interface NormalChatAPI {
  getBootstrap: () => Promise<ApiResponse<NormalChatBootstrap>>
  getConversation: (
    request: NormalChatGetConversationRequest
  ) => Promise<ApiResponse<NormalChatConversationSnapshot>>
  sendMessage: (
    request: NormalChatSendMessageRequest
  ) => Promise<ApiResponse<NormalChatSendMessageAccepted>>
  getConversationTurnDetail: (
    request: NormalChatGetConversationTurnDetailRequest
  ) => Promise<ApiResponse<NormalChatConversationTurnDetail | null>>
  deleteConversationTurn: (
    request: NormalChatDeleteConversationTurnRequest
  ) => Promise<ApiResponse<void>>
  abort: (request: NormalChatAbortRequest) => Promise<ApiResponse<void>>
  onStream: (handler: (event: NormalChatConversationStreamEvent) => void) => () => void
  createAssistant: (
    request: NormalChatCreateAssistantRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  updateAssistant: (
    request: NormalChatUpdateAssistantRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  assignLabel: (
    request: NormalChatAssignLabelRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  createLabel: (
    request: NormalChatCreateLabelRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  renameLabel: (
    request: NormalChatRenameLabelRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  deleteLabel: (
    request: NormalChatDeleteLabelRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  setActiveAssistant: (
    request: NormalChatSetActiveAssistantRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  createTopic: (
    request: NormalChatCreateTopicRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  renameTopic: (
    request: NormalChatRenameTopicRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  deleteTopic: (
    request: NormalChatDeleteTopicRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  setActiveTopic: (
    request: NormalChatSetActiveTopicRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
  updateTopicPrompt: (
    request: NormalChatUpdateTopicPromptRequest
  ) => Promise<ApiResponse<NormalChatWorkspaceSnapshot>>
}
