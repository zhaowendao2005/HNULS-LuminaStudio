import { ipcRenderer } from 'electron'
import type {
  GenerationAbortMessageRequest,
  GenerationApplyPlanningCommandProposalRequest,
  GenerationCreatePlanningDocumentFromMessageRequest,
  GenerationCreateSessionRequest,
  GenerationDeleteSessionRequest,
  GenerationGlobalSettings,
  GenerationListMessagesRequest,
  GenerationRejectPlanningCommandProposalRequest,
  GenerationSaveDocumentRequest,
  GenerationSavePlanningDocumentRequest,
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
