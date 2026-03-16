import { ipcRenderer } from 'electron'
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
  saveAnalysisDocument: (request: GenerationSaveAnalysisDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:saveAnalysisDocument', request),
  createDesignDocument: (request: GenerationCreateDesignDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:createDesignDocument', request),
  saveDesignDocument: (request: GenerationSaveDesignDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:saveDesignDocument', request),
  selectDesignDocument: (request: GenerationSelectDesignDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:selectDesignDocument', request),
  deleteDesignDocument: (request: GenerationDeleteDesignDocumentRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:deleteDesignDocument', request),
  compileDesignDocumentToWorkflow: (request: GenerationCompileDesignDocumentToWorkflowRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:compileDesignDocumentToWorkflow', request),
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
