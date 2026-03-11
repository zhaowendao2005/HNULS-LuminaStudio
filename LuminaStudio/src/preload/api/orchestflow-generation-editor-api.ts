import { ipcRenderer } from 'electron'
import type {
  GenerationAbortMessageRequest,
  GenerationCreateSessionRequest,
  GenerationListMessagesRequest,
  GenerationSaveDocumentRequest,
  GenerationSaveStageConfigRequest,
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
  listMessages: (request: GenerationListMessagesRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:listMessages', request),
  sendMessage: (request: GenerationSendMessageRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:sendMessage', request),
  abortMessage: (request: GenerationAbortMessageRequest) =>
    ipcRenderer.invoke('orchestflowGenerationEditor:abortMessage', request),
  onStream: (handler: (event: GenerationStreamEvent) => void) => {
    const listener = (_event: unknown, payload: GenerationStreamEvent) => handler(payload)
    ipcRenderer.on('orchestflowGenerationEditor:stream', listener)
    return () => ipcRenderer.off('orchestflowGenerationEditor:stream', listener)
  }
}
