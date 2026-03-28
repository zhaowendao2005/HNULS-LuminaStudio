import { BaseIPCHandler } from './base-handler'
import type { NormalChatConversationStreamEvent } from '@preload/types'
import type { NormalChatService } from '../services/normal-chat'

export class NormalChatIPCHandler extends BaseIPCHandler {
  constructor(private readonly normalChatService: NormalChatService) {
    super()
    this.normalChatService.setStreamEmitter((event: NormalChatConversationStreamEvent) => {
      this.broadcastToAll('normalChat:stream', event)
    })
    this.register()
  }

  protected getChannelPrefix(): string {
    return 'normalChat'
  }

  async handleGetBootstrap(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.getBootstrap() }
  }

  async handleCreateAssistant(): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.createAssistant() }
  }

  async handleUpdateAssistant(
    _event: unknown,
    payload: Parameters<NormalChatService['updateAssistant']>[0]
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.updateAssistant(payload) }
  }

  async handleAssignLabel(
    _event: unknown,
    payload: { assistantId: string; labelId: string | null }
  ): Promise<{ success: true; data: unknown }> {
    return {
      success: true,
      data: this.normalChatService.assignLabel(payload.assistantId, payload.labelId)
    }
  }

  async handleCreateLabel(
    _event: unknown,
    payload: { name: string }
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.createLabel(payload.name) }
  }

  async handleRenameLabel(
    _event: unknown,
    payload: { labelId: string; name: string }
  ): Promise<{ success: true; data: unknown }> {
    return {
      success: true,
      data: this.normalChatService.renameLabel(payload.labelId, payload.name)
    }
  }

  async handleDeleteLabel(
    _event: unknown,
    payload: { labelId: string }
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.deleteLabel(payload.labelId) }
  }

  async handleSetActiveAssistant(
    _event: unknown,
    payload: { assistantId: string }
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.setActiveAssistant(payload.assistantId) }
  }

  async handleCreateTopic(
    _event: unknown,
    payload: { assistantId: string }
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.createTopic(payload.assistantId) }
  }

  async handleRenameTopic(
    _event: unknown,
    payload: { assistantId: string; topicId: string; title: string }
  ): Promise<{ success: true; data: unknown }> {
    return {
      success: true,
      data: this.normalChatService.renameTopic(payload.assistantId, payload.topicId, payload.title)
    }
  }

  async handleDeleteTopic(
    _event: unknown,
    payload: { assistantId: string; topicId: string }
  ): Promise<{ success: true; data: unknown }> {
    return {
      success: true,
      data: this.normalChatService.deleteTopic(payload.assistantId, payload.topicId)
    }
  }

  async handleSetActiveTopic(
    _event: unknown,
    payload: { assistantId: string; topicId: string }
  ): Promise<{ success: true; data: unknown }> {
    return {
      success: true,
      data: this.normalChatService.setActiveTopic(payload.assistantId, payload.topicId)
    }
  }

  async handleUpdateTopicPrompt(
    _event: unknown,
    payload: Parameters<NormalChatService['updateTopicPrompt']>[0]
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.updateTopicPrompt(payload) }
  }

  async handleUpdateTopicStreaming(
    _event: unknown,
    payload: Parameters<NormalChatService['updateTopicStreaming']>[0]
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.updateTopicStreaming(payload) }
  }

  async handleUpdateTopicConfig(
    _event: unknown,
    payload: Parameters<NormalChatService['updateTopicConfig']>[0]
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.updateTopicConfig(payload) }
  }

  async handleGetConversation(
    _event: unknown,
    payload: { topicId: string }
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: this.normalChatService.getConversation(payload.topicId) }
  }

  async handleGetConversationTurnDetail(
    _event: unknown,
    payload: { requestId: string }
  ): Promise<{ success: true; data: unknown }> {
    return {
      success: true,
      data: this.normalChatService.getConversationTurnDetail(payload.requestId)
    }
  }

  async handleSendMessage(
    _event: unknown,
    payload: Parameters<NormalChatService['sendMessage']>[0]
  ): Promise<{ success: true; data: unknown }> {
    return { success: true, data: await this.normalChatService.sendMessage(payload) }
  }

  async handleDeleteConversationTurn(
    _event: unknown,
    payload: { requestId: string }
  ): Promise<{ success: true; data: void }> {
    this.normalChatService.deleteConversationTurn(payload.requestId)
    return { success: true, data: undefined }
  }

  async handleAbort(
    _event: unknown,
    payload: { requestId: string }
  ): Promise<{ success: true; data: void }> {
    this.normalChatService.abort(payload.requestId)
    return { success: true, data: undefined }
  }
}
