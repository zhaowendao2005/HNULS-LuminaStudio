import type {
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
  GenerationUpdateSessionStateRequest
} from '@preload/types'

export const OrchestflowGenerationEditorDataSource = {
  listSessions: () => window.api.orchestflowGenerationEditor.listSessions(),
  createSession: (request: GenerationCreateSessionRequest) =>
    window.api.orchestflowGenerationEditor.createSession(request),
  getSessionDetail: (sessionId: string) =>
    window.api.orchestflowGenerationEditor.getSessionDetail(sessionId),
  updateSessionState: (request: GenerationUpdateSessionStateRequest) =>
    window.api.orchestflowGenerationEditor.updateSessionState(request),
  saveStageConfig: (request: GenerationSaveStageConfigRequest) =>
    window.api.orchestflowGenerationEditor.saveStageConfig(request),
  saveAnalysisDocument: (request: GenerationSaveAnalysisDocumentRequest) =>
    window.api.orchestflowGenerationEditor.saveAnalysisDocument(request),
  createDesignDocument: (request: GenerationCreateDesignDocumentRequest) =>
    window.api.orchestflowGenerationEditor.createDesignDocument(request),
  saveDesignDocument: (request: GenerationSaveDesignDocumentRequest) =>
    window.api.orchestflowGenerationEditor.saveDesignDocument(request),
  selectDesignDocument: (request: GenerationSelectDesignDocumentRequest) =>
    window.api.orchestflowGenerationEditor.selectDesignDocument(request),
  deleteDesignDocument: (request: GenerationDeleteDesignDocumentRequest) =>
    window.api.orchestflowGenerationEditor.deleteDesignDocument(request),
  compileDesignDocumentToWorkflow: (request: GenerationCompileDesignDocumentToWorkflowRequest) =>
    window.api.orchestflowGenerationEditor.compileDesignDocumentToWorkflow(request),
  listMessages: (request: GenerationListMessagesRequest) =>
    window.api.orchestflowGenerationEditor.listMessages(request),
  getGlobalSettings: () => window.api.orchestflowGenerationEditor.getGlobalSettings(),
  updateGlobalSettings: (settings: Partial<GenerationGlobalSettings>) =>
    window.api.orchestflowGenerationEditor.updateGlobalSettings(settings),
  sendMessage: (request: GenerationSendMessageRequest) =>
    window.api.orchestflowGenerationEditor.sendMessage(request),
  abortMessage: (requestId: string) =>
    window.api.orchestflowGenerationEditor.abortMessage({ requestId }),
  deleteSession: (request: GenerationDeleteSessionRequest) =>
    window.api.orchestflowGenerationEditor.deleteSession(request),
  onStream: (handler: (event: GenerationStreamEvent) => void) =>
    window.api.orchestflowGenerationEditor.onStream(handler)
}
