import type {
  NormalChatAbortRequest,
  NormalChatAssignLabelRequest,
  NormalChatCreateLabelRequest,
  NormalChatCreateAssistantRequest,
  NormalChatCreateTopicRequest,
  NormalChatDeleteLabelRequest,
  NormalChatDeleteConversationTurnRequest,
  NormalChatDeleteTopicRequest,
  NormalChatGetConversationTurnDetailRequest,
  NormalChatGetConversationRequest,
  NormalChatRenameLabelRequest,
  NormalChatRenameTopicRequest,
  NormalChatSendMessageRequest,
  NormalChatSetActiveAssistantRequest,
  NormalChatSetActiveTopicRequest,
  NormalChatUpdateAssistantRequest,
  NormalChatUpdateTopicStreamingRequest,
  NormalChatUpdateTopicPromptRequest
} from '@preload/types'
import { BaseIPCHandler } from './base-handler'
import type { NormalChatService } from '../services/normal-chat'
import type { NormalChatConversationRuntimeService } from '../services/normal-chat/runtime/conversation-runtime'

export class NormalChatIPCHandler extends BaseIPCHandler {
  constructor(
    private readonly normalChatService: NormalChatService,
    private readonly normalChatConversationRuntimeService: NormalChatConversationRuntimeService
  ) {
    super()
    this.register()

    this.normalChatConversationRuntimeService.onStream((event) => {
      this.broadcastToAll('normalChat:stream', event)
    })
  }

  protected getChannelPrefix(): string {
    return 'normalChat'
  }

  async handleGetBootstrap(): Promise<{ success: true; data: unknown }> {
    return {
      success: true,
      data: await this.normalChatService.getBootstrap()
    }
  }

  async handleGetConversation(
    _event: unknown,
    request: NormalChatGetConversationRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.topicId) {
      return { success: false, error: 'Missing topicId' }
    }

    return {
      success: true,
      data: await this.normalChatConversationRuntimeService.getConversation(request.topicId)
    }
  }

  async handleGetConversationTurnDetail(
    _event: unknown,
    request: NormalChatGetConversationTurnDetailRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.requestId) {
      return { success: false, error: 'Missing requestId' }
    }

    return {
      success: true,
      data: await this.normalChatService.getConversationTurnDetail(request.requestId)
    }
  }

  async handleCreateAssistant(
    _event: unknown,
    request: NormalChatCreateAssistantRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    void request

    return {
      success: true,
      data: await this.normalChatService.createAssistant()
    }
  }

  async handleUpdateAssistant(
    _event: unknown,
    request: NormalChatUpdateAssistantRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.assistantId) {
      return { success: false, error: 'Missing assistantId' }
    }

    return {
      success: true,
      data: await this.normalChatService.updateAssistant(request)
    }
  }

  async handleAssignLabel(
    _event: unknown,
    request: NormalChatAssignLabelRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.assistantId) {
      return { success: false, error: 'Missing assistantId' }
    }

    return {
      success: true,
      data: await this.normalChatService.assignLabel(request)
    }
  }

  async handleCreateLabel(
    _event: unknown,
    request: NormalChatCreateLabelRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.name) {
      return { success: false, error: 'Missing label name' }
    }

    return {
      success: true,
      data: await this.normalChatService.createLabel(request.name)
    }
  }

  async handleRenameLabel(
    _event: unknown,
    request: NormalChatRenameLabelRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.labelId || !request?.name) {
      return { success: false, error: 'Missing labelId or name' }
    }

    return {
      success: true,
      data: await this.normalChatService.renameLabel(request)
    }
  }

  async handleDeleteLabel(
    _event: unknown,
    request: NormalChatDeleteLabelRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.labelId) {
      return { success: false, error: 'Missing labelId' }
    }

    return {
      success: true,
      data: await this.normalChatService.deleteLabel(request.labelId)
    }
  }

  async handleSetActiveAssistant(
    _event: unknown,
    request: NormalChatSetActiveAssistantRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.assistantId) {
      return { success: false, error: 'Missing assistantId' }
    }

    return {
      success: true,
      data: await this.normalChatService.setActiveAssistant(request.assistantId)
    }
  }

  async handleCreateTopic(
    _event: unknown,
    request: NormalChatCreateTopicRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.assistantId) {
      return { success: false, error: 'Missing assistantId' }
    }

    return {
      success: true,
      data: await this.normalChatService.createTopic(request.assistantId)
    }
  }

  async handleRenameTopic(
    _event: unknown,
    request: NormalChatRenameTopicRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.assistantId || !request?.topicId) {
      return { success: false, error: 'Missing assistantId or topicId' }
    }

    return {
      success: true,
      data: await this.normalChatService.renameTopic(request)
    }
  }

  async handleDeleteTopic(
    _event: unknown,
    request: NormalChatDeleteTopicRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.assistantId || !request?.topicId) {
      return { success: false, error: 'Missing assistantId or topicId' }
    }

    return {
      success: true,
      data: await this.normalChatService.deleteTopic(request)
    }
  }

  async handleDeleteConversationTurn(
    _event: unknown,
    request: NormalChatDeleteConversationTurnRequest
  ): Promise<{ success: true; data: undefined } | { success: false; error: string }> {
    if (!request?.requestId) {
      return { success: false, error: 'Missing requestId' }
    }

    await this.normalChatService.deleteConversationTurn(request.requestId)
    return { success: true, data: undefined }
  }

  async handleSetActiveTopic(
    _event: unknown,
    request: NormalChatSetActiveTopicRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.assistantId || !request?.topicId) {
      return { success: false, error: 'Missing assistantId or topicId' }
    }

    return {
      success: true,
      data: await this.normalChatService.setActiveTopic(request)
    }
  }

  async handleUpdateTopicPrompt(
    _event: unknown,
    request: NormalChatUpdateTopicPromptRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.assistantId || !request?.topicId || !request?.mode) {
      return { success: false, error: 'Missing assistantId, topicId or mode' }
    }

    return {
      success: true,
      data: await this.normalChatService.updateTopicPrompt(request)
    }
  }

  async handleUpdateTopicStreaming(
    _event: unknown,
    request: NormalChatUpdateTopicStreamingRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.assistantId || !request?.topicId || !request?.mode) {
      return { success: false, error: 'Missing assistantId, topicId or mode' }
    }

    return {
      success: true,
      data: await this.normalChatService.updateTopicStreaming(request)
    }
  }

  async handleSendMessage(
    _event: unknown,
    request: NormalChatSendMessageRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.topicId || !request?.providerId || !request?.modelId || !request?.input?.trim()) {
      return {
        success: false,
        error: 'Missing topicId, providerId, modelId or input'
      }
    }

    return {
      success: true,
      data: await this.normalChatConversationRuntimeService.sendMessage(request)
    }
  }

  async handleAbort(
    _event: unknown,
    request: NormalChatAbortRequest
  ): Promise<{ success: true; data: undefined } | { success: false; error: string }> {
    if (!request?.requestId) {
      return { success: false, error: 'Missing requestId' }
    }

    await this.normalChatConversationRuntimeService.abort(request.requestId)
    return { success: true, data: undefined }
  }
}
