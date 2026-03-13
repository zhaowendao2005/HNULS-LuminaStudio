import { ipcRenderer } from 'electron'
import type {
  GenerationAbortMessageRequest,
  GenerationApplyPlanningCommandProposalRequest,
  GenerationCreateDesignDocumentFromPlanningRequest,
  GenerationCreatePlanningDocumentFromMessageRequest,
  GenerationCreateSessionRequest,
  GenerationDeleteDesignDocumentRequest,
  GenerationDeleteSessionRequest,
  GenerationGlobalSettings,
  GenerationListDesignDocumentsRequest,
  GenerationListMessagesRequest,
  GenerationRejectPlanningCommandProposalRequest,
  GenerationSaveDesignDocumentRequest,
  GenerationSaveDocumentRequest,
  GenerationSavePlanningDocumentRequest,
  GenerationSelectDesignDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSelectPlanningDocumentRequest,
  GenerationSendMessageRequest,
  GenerationStreamEvent,
  GenerationUpdateSessionStateRequest,
  OrchestrflowGenerationEditorAPI
} from '../types'

export const orchestflowGenerationEditorAPI: OrchestrflowGenerationEditorAPI = {
  listSessions: () => ipcRenderer.invoke('orchestflowGenerationEditor:listSessions'),
  createSession: (request: GenerationCreateSessionRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:createSession', request),
  getSessionDetail: (sessionId: string) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:getSessionDetail', sessionId),
  updateSessionState: (request: GenerationUpdateSessionStateRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:updateSessionState', request),
  saveStageConfig: (request: GenerationSaveStageConfigRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:saveStageConfig', request),
  saveDocument: (request: GenerationSaveDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:saveDocument', request),
  savePlanningDocument: (request: GenerationSavePlanningDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:savePlanningDocument', request),
  selectPlanningDocument: (request: GenerationSelectPlanningDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:selectPlanningDocument', request),
  getOrCreatePlanningDocumentFromMessage: (
    request: GenerationCreatePlanningDocumentFromMessageRequest
  ) =>
    ipcRenderer.invoke(
      'orchestflowGenerationEditor:getOrCreatePlanningDocumentFromMessage',
      request
    ),
  createDesignDocumentFromPlanning: (request: GenerationCreateDesignDocumentFromPlanningRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:createDesignDocumentFromPlanning', request),
  listDesignDocuments: (request: GenerationListDesignDocumentsRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:listDesignDocuments', request),
  saveDesignDocument: (request: GenerationSaveDesignDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:saveDesignDocument', request),
  selectDesignDocument: (request: GenerationSelectDesignDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:selectDesignDocument', request),
  deleteDesignDocument: (request: GenerationDeleteDesignDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:deleteDesignDocument', request),
  applyPlanningCommandProposal: (request: GenerationApplyPlanningCommandProposalRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:applyPlanningCommandProposal', request),
  rejectPlanningCommandProposal: (request: GenerationRejectPlanningCommandProposalRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:rejectPlanningCommandProposal', request),
  listMessages: (request: GenerationListMessagesRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:listMessages', request),
  getGlobalSettings: () => ipcRenderer.invoke('orchestflowGenerationEditor:getGlobalSettings'),
  updateGlobalSettings: (settings: Partial<GenerationGlobalSettings>) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:updateGlobalSettings', settings),
  sendMessage: (request: GenerationSendMessageRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:sendMessage', request),
  abortMessage: (request: GenerationAbortMessageRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:abortMessage', request),
  deleteSession: (request: GenerationDeleteSessionRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:deleteSession', request),
  onStream: (handler: (event: GenerationStreamEvent) => void) => {
    const listener = (_event: unknown, payload: GenerationStreamEvent) => handler(payload)
    ipcRenderer.on('orchestflowGenerationEditor:stream', listener)
    return () => ipcRenderer.off('orchestflowGenerationEditor:stream', listener)
  }
}
