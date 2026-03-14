import type { IpcMainInvokeEvent } from 'electron'
import { BaseIPCHandler } from './base-handler'
import type { OrchestflowGenerationEditorService } from '../services/orchestflow-generation-editor'
import type {
  GenerationAbortMessageRequest,
  GenerationApplyDesignCalibrationProposalRequest,
  GenerationApplyPlanningCommandProposalRequest,
  GenerationCompileDesignDocumentToWorkflowRequest,
  GenerationCreateDesignDocumentFromPlanningRequest,
  GenerationCreatePlanningDocumentFromMessageRequest,
  GenerationCreateSessionRequest,
  GenerationDeleteDesignDocumentRequest,
  GenerationDeleteSessionRequest,
  GenerationGlobalSettings,
  GenerationListDesignDocumentsRequest,
  GenerationListMessagesRequest,
  GenerationRejectDesignCalibrationProposalRequest,
  GenerationRejectPlanningCommandProposalRequest,
  GenerationSaveDesignDocumentRequest,
  GenerationSaveDocumentRequest,
  GenerationSavePlanningDocumentRequest,
  GenerationSelectDesignDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSelectPlanningDocumentRequest,
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

  async handleSavePlanningDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationSavePlanningDocumentRequest
  ) {
    if (!request?.sessionId || !request?.document?.id) {
      return { success: false, error: 'Invalid planning document request' }
    }
    return { success: true, data: await this.service.savePlanningDocument(request) }
  }

  async handleSelectPlanningDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationSelectPlanningDocumentRequest
  ) {
    if (!request?.sessionId || !request?.stageKey || !request?.documentId) {
      return { success: false, error: 'Invalid planning selection request' }
    }
    return { success: true, data: await this.service.selectPlanningDocument(request) }
  }

  async handleGetOrCreatePlanningDocumentFromMessage(
    _event: IpcMainInvokeEvent,
    request: GenerationCreatePlanningDocumentFromMessageRequest
  ) {
    if (!request?.sessionId || !request?.messageId) {
      return { success: false, error: 'Invalid planning source request' }
    }
    return {
      success: true,
      data: await this.service.getOrCreatePlanningDocumentFromMessage(request)
    }
  }

  async handleCreateDesignDocumentFromPlanning(
    _event: IpcMainInvokeEvent,
    request: GenerationCreateDesignDocumentFromPlanningRequest
  ) {
    if (!request?.sessionId || !request?.planningDocumentId) {
      return { success: false, error: 'Invalid design source request' }
    }
    return {
      success: true,
      data: await this.service.createDesignDocumentFromPlanning(request)
    }
  }

  async handleListDesignDocuments(
    _event: IpcMainInvokeEvent,
    request: GenerationListDesignDocumentsRequest
  ) {
    if (!request?.sessionId) {
      return { success: false, error: 'Missing sessionId' }
    }
    return {
      success: true,
      data: await this.service.listDesignDocuments(request)
    }
  }

  async handleSaveDesignDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationSaveDesignDocumentRequest
  ) {
    if (!request?.sessionId || !request?.document?.id) {
      return { success: false, error: 'Invalid design save request' }
    }
    return {
      success: true,
      data: await this.service.saveDesignDocument(request)
    }
  }

  async handleCompileDesignDocumentToWorkflow(
    _event: IpcMainInvokeEvent,
    request: GenerationCompileDesignDocumentToWorkflowRequest
  ) {
    if (!request?.sessionId || !request?.designDocumentId) {
      return { success: false, error: 'Invalid design compile request' }
    }
    return {
      success: true,
      data: await this.service.compileDesignDocumentToWorkflow(request)
    }
  }

  async handleSelectDesignDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationSelectDesignDocumentRequest
  ) {
    if (!request?.sessionId || !request?.designDocumentId) {
      return { success: false, error: 'Invalid design selection request' }
    }
    return {
      success: true,
      data: await this.service.selectDesignDocument(request)
    }
  }

  async handleDeleteDesignDocument(
    _event: IpcMainInvokeEvent,
    request: GenerationDeleteDesignDocumentRequest
  ) {
    if (!request?.sessionId || !request?.designDocumentId) {
      return { success: false, error: 'Invalid design delete request' }
    }
    await this.service.deleteDesignDocument(request)
    return { success: true }
  }

  async handleApplyPlanningCommandProposal(
    _event: IpcMainInvokeEvent,
    request: GenerationApplyPlanningCommandProposalRequest
  ) {
    if (!request?.sessionId || !request?.messageId) {
      return { success: false, error: 'Invalid planning apply request' }
    }
    return { success: true, data: await this.service.applyPlanningCommandProposal(request) }
  }

  async handleApplyDesignCalibrationProposal(
    _event: IpcMainInvokeEvent,
    request: GenerationApplyDesignCalibrationProposalRequest
  ) {
    if (!request?.sessionId || !request?.messageId) {
      return { success: false, error: 'Invalid design calibration apply request' }
    }
    return { success: true, data: await this.service.applyDesignCalibrationProposal(request) }
  }

  async handleRejectPlanningCommandProposal(
    _event: IpcMainInvokeEvent,
    request: GenerationRejectPlanningCommandProposalRequest
  ) {
    if (!request?.sessionId || !request?.messageId) {
      return { success: false, error: 'Invalid planning reject request' }
    }
    return { success: true, data: await this.service.rejectPlanningCommandProposal(request) }
  }

  async handleRejectDesignCalibrationProposal(
    _event: IpcMainInvokeEvent,
    request: GenerationRejectDesignCalibrationProposalRequest
  ) {
    if (!request?.sessionId || !request?.messageId) {
      return { success: false, error: 'Invalid design calibration reject request' }
    }
    return { success: true, data: await this.service.rejectDesignCalibrationProposal(request) }
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
