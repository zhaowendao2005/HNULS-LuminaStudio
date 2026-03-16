import type { IpcMainInvokeEvent } from 'electron'
import { BaseIPCHandler } from './base-handler'
import type { OrchestflowGenerationEditorService } from '../services/orchestflow-generation-editor'
import type {
  GenerationAbortMessageRequest,
  GenerationCompileDesignDocumentToWorkflowRequest,
  GenerationCreateDesignDocumentRequest,
  GenerationCreateSessionRequest,
  GenerationDeleteDesignDocumentRequest,
  GenerationDeleteSessionRequest,
  GenerationGlobalSettings,
  GenerationListMessagesRequest,
  GenerationSaveAnalysisDocumentRequest,
  GenerationSaveDesignDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSelectDesignDocumentRequest,
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
    return { success: true, data: this.service.listSessions() }
  }

  async handleCreateSession(_event: IpcMainInvokeEvent, request: GenerationCreateSessionRequest) {
    return { success: true, data: this.service.createSession(request) }
  }

  async handleGetSessionDetail(_event: IpcMainInvokeEvent, sessionId: string) {
    return { success: true, data: this.service.getSessionDetail(sessionId) }
  }

  async handleUpdateSessionState(
    _event: IpcMainInvokeEvent,
    request: GenerationUpdateSessionStateRequest
  ) {
    return { success: true, data: this.service.updateSessionState(request) }
  }

  async handleSaveStageConfig(
    _event: IpcMainInvokeEvent,
    request: GenerationSaveStageConfigRequest
  ) {
    return { success: true, data: this.service.saveStageConfig(request) }
  }

  async handleSaveAnalysisDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationSaveAnalysisDocumentRequest
  ) {
    return { success: true, data: this.service.saveAnalysisDocument(request) }
  }

  async handleCreateDesignDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationCreateDesignDocumentRequest
  ) {
    return { success: true, data: this.service.createDesignDocument(request) }
  }

  async handleSaveDesignDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationSaveDesignDocumentRequest
  ) {
    return { success: true, data: this.service.saveDesignDocument(request) }
  }

  async handleSelectDesignDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationSelectDesignDocumentRequest
  ) {
    return { success: true, data: this.service.selectDesignDocument(request) }
  }

  async handleDeleteDesignDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationDeleteDesignDocumentRequest
  ) {
    this.service.deleteDesignDocument(request)
    return { success: true }
  }

  async handleCompileDesignDocumentToWorkflow(
    _event: IpcMainInvokeEvent,
    request: GenerationCompileDesignDocumentToWorkflowRequest
  ) {
    return { success: true, data: await this.service.compileDesignDocumentToWorkflow(request) }
  }

  async handleListMessages(_event: IpcMainInvokeEvent, request: GenerationListMessagesRequest) {
    return { success: true, data: this.service.listMessages(request) }
  }

  async handleGetGlobalSettings() {
    return { success: true, data: this.service.getGlobalSettings() }
  }

  async handleUpdateGlobalSettings(
    _event: IpcMainInvokeEvent,
    settings: Partial<GenerationGlobalSettings>
  ) {
    return { success: true, data: this.service.updateGlobalSettings(settings) }
  }

  async handleSendMessage(_event: IpcMainInvokeEvent, request: GenerationSendMessageRequest) {
    return { success: true, data: await this.service.sendMessage(_event.sender, request) }
  }

  async handleAbortMessage(_event: IpcMainInvokeEvent, request: GenerationAbortMessageRequest) {
    await this.service.abortMessage(request.requestId)
    return { success: true }
  }

  async handleDeleteSession(_event: IpcMainInvokeEvent, request: GenerationDeleteSessionRequest) {
    this.service.deleteSession(request)
    return { success: true }
  }
}
