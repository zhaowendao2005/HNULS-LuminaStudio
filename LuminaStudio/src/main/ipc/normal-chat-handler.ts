import type {
  NormalChatAssignLabelRequest,
  NormalChatCreateLabelRequest,
  NormalChatCreateAssistantRequest,
  NormalChatCreateTopicRequest,
  NormalChatDeleteLabelRequest,
  NormalChatDeleteTopicRequest,
  NormalChatRenameLabelRequest,
  NormalChatRenameTopicRequest,
  NormalChatSetActiveAssistantRequest,
  NormalChatSetActiveTopicRequest,
  NormalChatUpdateAssistantRequest,
  NormalChatUpdateTopicPromptRequest
} from '@preload/types'
import { BaseIPCHandler } from './base-handler'
import type { NormalChatService } from '../services/normal-chat'

export class NormalChatIPCHandler extends BaseIPCHandler {
  constructor(private readonly normalChatService: NormalChatService) {
    super()
    this.register()
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

  async handleCreateAssistant(
    _event: unknown,
    request: NormalChatCreateAssistantRequest
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    if (!request?.templateKey) {
      return { success: false, error: 'Missing templateKey' }
    }

    return {
      success: true,
      data: await this.normalChatService.createAssistant(request.templateKey)
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
}
