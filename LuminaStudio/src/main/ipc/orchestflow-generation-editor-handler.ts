import type { IpcMainInvokeEvent } from 'electron'
import { BaseIPCHandler } from './base-handler'
import type { OrchestflowGenerationEditorService } from '../services/orchestflow-generation-editor'
import type {  GenerationAbortMessageRequest,
  GenerationCreateSessionRequest,
  GenerationDeleteSessionRequest,GenerationListMessagesRequest,
  GenerationGlobalSettings,
  GenerationSaveDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSendMessageRequest,
  GenerationUpdateSessionStateRequest
} from '@preload/types'

export class OrchestflowGenerationEditorIPCHandler extends BaseIPCHandler {
  constructor(private readonly service: OrchestflowGenerationEditorService) {
    super()
    this.register()
  }

  protected getChannelPrefix(): string {
    return 'orchestflowGenerationEditor'
  }

  async handleListSessions() {
    return { success: true, data: await this.service.listSessions() }
  }

  async handleCreateSession(_event: IpcMainInvokeEvent, request: GenerationCreateSessionRequest) {
    if (!request?.title?.trim()) {
      return { success: false, error: 'Missing title' }
    }
    return { success: true, data: await this.service.createSession(request) }
  }

  async handleGetSessionDetail(_event: IpcMainInvokeEvent, sessionId: string) {
    if (!sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    return { success: true, data: await this.service.getSessionDetail(sessionId) }
  }

  async handleUpdateSessionState(
    _event: IpcMainInvokeEvent,
    request: GenerationUpdateSessionStateRequest
  ) {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    return { success: true, data: await this.service.updateSessionState(request) }
  }

  async handleSaveStageConfig(
    _event: IpcMainInvokeEvent,
    request: GenerationSaveStageConfigRequest
  ) {
    if (!request?.sessionId || !request?.config) {
      return { success: false, error: 'Invalid request' }
    }
    return { success: true, data: await this.service.saveStageConfig(request) }
  }

  async handleSaveDocument(_event: IpcMainInvokeEvent, request: GenerationSaveDocumentRequest) {
    if (!request?.sessionId || !request?.document) {
      return { success: false, error: 'Invalid request' }
    }
    return { success: true, data: await this.service.saveDocument(request) }
  }

  async handleListMessages(_event: IpcMainInvokeEvent, request: GenerationListMessagesRequest) {
    if (!request?.sessionId || !request?.channelKey) {
      return { success: false, error: 'Invalid request' }
    }
    return { success: true, data: await this.service.listMessages(request) }
  }

  async handleSendMessage(_event: IpcMainInvokeEvent, request: GenerationSendMessageRequest) {
    if (!request?.sessionId || !request?.channelKey || !request?.providerId || !request?.modelId) {
      return { success: false, error: 'Invalid request' }
    }
    return { success: true, data: await this.service.sendMessage(_event.sender, request) }
  }

  async handleGetGlobalSettings() {
    return { success: true, data: await this.service.getGlobalSettings() }
  }

  async handleUpdateGlobalSettings(
    _event: IpcMainInvokeEvent,
    settings: Partial<GenerationGlobalSettings>
  ) {
    return { success: true, data: await this.service.updateGlobalSettings(settings) }
  }

  async handleAbortMessage(_event: IpcMainInvokeEvent, request: GenerationAbortMessageRequest) {
    if (!request?.requestId) {
      return { success: false, error: 'Missing requestId' }
    }
    await this.service.abortMessage(request.requestId)
    return { success: true }
  }

  async handleDeleteSession(_event: IpcMainInvokeEvent, request: GenerationDeleteSessionRequest) {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    await this.service.deleteSession(request.sessionId)
    return { success: true }
  }
}
