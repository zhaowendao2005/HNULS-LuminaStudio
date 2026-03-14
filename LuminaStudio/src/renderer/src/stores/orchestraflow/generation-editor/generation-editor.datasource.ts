import type {
  GenerationApplyPlanningCommandProposalRequest,
  GenerationApplyDesignCalibrationProposalRequest,
  GenerationCompileDesignDocumentToWorkflowRequest,
  GenerationCompileDesignDocumentToWorkflowResult,
  GenerationCreateDesignDocumentFromPlanningRequest,
  GenerationCreatePlanningDocumentFromMessageRequest,
  GenerationCreateSessionRequest,
  GenerationDeleteDesignDocumentRequest,
  GenerationDesignDocument,
  GenerationDeleteSessionRequest,
  GenerationGlobalSettings,
  GenerationRejectDesignCalibrationProposalRequest,
  GenerationRejectPlanningCommandProposalRequest,
  GenerationListDesignDocumentsRequest,
  GenerationRuntimeStageKey,
  GenerationSaveDesignDocumentRequest,
  GenerationSaveDocumentRequest,
  GenerationSavePlanningDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSelectDesignDocumentRequest,
  GenerationSelectPlanningDocumentRequest,
  GenerationSendMessageRequest,
  GenerationSessionDetail,
  GenerationSessionSummary,
  GenerationStreamEvent,
  GenerationUpdateSessionStateRequest
} from '@preload/types'

/**
 * 根 datasource 现在只做“共享后端访问入口”。
 *
 * 各业务域 datasource 直接复用这里的方法，
 * 避免每个域都重复写一遍 window.api 调用和错误处理。
 */
export const OrchestflowGenerationEditorDataSource = {
  async listSessions(): Promise<GenerationSessionSummary[]> {
    const response = await window.api.orchestflowGenerationEditor.listSessions()
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to list sessions')
    }
    return response.data
  },

  async createSession(request: GenerationCreateSessionRequest): Promise<GenerationSessionDetail> {
    const response = await window.api.orchestflowGenerationEditor.createSession(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create session')
    }
    return response.data
  },

  async deleteSession(request: GenerationDeleteSessionRequest): Promise<void> {
    const response = await window.api.orchestflowGenerationEditor.deleteSession(request)
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete session')
    }
  },

  async getSessionDetail(sessionId: string): Promise<GenerationSessionDetail> {
    const response = await window.api.orchestflowGenerationEditor.getSessionDetail(sessionId)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get session detail')
    }
    return response.data
  },

  async updateSessionState(request: GenerationUpdateSessionStateRequest) {
    const response = await window.api.orchestflowGenerationEditor.updateSessionState(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update session state')
    }
    return response.data
  },

  async saveStageConfig(request: GenerationSaveStageConfigRequest) {
    const response = await window.api.orchestflowGenerationEditor.saveStageConfig(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to save stage config')
    }
    return response.data
  },

  async saveDocument(request: GenerationSaveDocumentRequest) {
    const response = await window.api.orchestflowGenerationEditor.saveDocument(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to save document')
    }
    return response.data
  },

  async savePlanningDocument(request: GenerationSavePlanningDocumentRequest) {
    const response = await window.api.orchestflowGenerationEditor.savePlanningDocument(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to save planning document')
    }
    return response.data
  },

  async selectPlanningDocument(request: GenerationSelectPlanningDocumentRequest) {
    const response = await window.api.orchestflowGenerationEditor.selectPlanningDocument(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to select planning document')
    }
    return response.data
  },

  async getOrCreatePlanningDocumentFromMessage(
    request: GenerationCreatePlanningDocumentFromMessageRequest
  ) {
    const response =
      await window.api.orchestflowGenerationEditor.getOrCreatePlanningDocumentFromMessage(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create planning document from message')
    }
    return response.data
  },

  async createDesignDocumentFromPlanning(
    request: GenerationCreateDesignDocumentFromPlanningRequest
  ): Promise<GenerationDesignDocument> {
    const response =
      await window.api.orchestflowGenerationEditor.createDesignDocumentFromPlanning(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create design document from planning')
    }
    return response.data
  },

  async listDesignDocuments(
    request: GenerationListDesignDocumentsRequest
  ): Promise<GenerationDesignDocument[]> {
    const response = await window.api.orchestflowGenerationEditor.listDesignDocuments(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to list design documents')
    }
    return response.data
  },

  async saveDesignDocument(request: GenerationSaveDesignDocumentRequest) {
    const response = await window.api.orchestflowGenerationEditor.saveDesignDocument(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to save design document')
    }
    return response.data
  },

  async compileDesignDocumentToWorkflow(
    request: GenerationCompileDesignDocumentToWorkflowRequest
  ): Promise<GenerationCompileDesignDocumentToWorkflowResult> {
    const response =
      await window.api.orchestflowGenerationEditor.compileDesignDocumentToWorkflow(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to compile design document to workflow')
    }
    return response.data
  },

  async selectDesignDocument(request: GenerationSelectDesignDocumentRequest) {
    const response = await window.api.orchestflowGenerationEditor.selectDesignDocument(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to select design document')
    }
    return response.data
  },

  async deleteDesignDocument(request: GenerationDeleteDesignDocumentRequest): Promise<void> {
    const response = await window.api.orchestflowGenerationEditor.deleteDesignDocument(request)
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete design document')
    }
  },

  async applyPlanningCommandProposal(request: GenerationApplyPlanningCommandProposalRequest) {
    const response =
      await window.api.orchestflowGenerationEditor.applyPlanningCommandProposal(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to apply planning command proposal')
    }
    return response.data
  },

  async applyDesignCalibrationProposal(request: GenerationApplyDesignCalibrationProposalRequest) {
    const response =
      await window.api.orchestflowGenerationEditor.applyDesignCalibrationProposal(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to apply design calibration proposal')
    }
    return response.data
  },

  async rejectPlanningCommandProposal(request: GenerationRejectPlanningCommandProposalRequest) {
    const response =
      await window.api.orchestflowGenerationEditor.rejectPlanningCommandProposal(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to reject planning command proposal')
    }
    return response.data
  },

  async rejectDesignCalibrationProposal(request: GenerationRejectDesignCalibrationProposalRequest) {
    const response =
      await window.api.orchestflowGenerationEditor.rejectDesignCalibrationProposal(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to reject design calibration proposal')
    }
    return response.data
  },

  async getGlobalSettings(): Promise<GenerationGlobalSettings> {
    const response = await window.api.orchestflowGenerationEditor.getGlobalSettings()
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get global settings')
    }
    return response.data
  },

  async updateGlobalSettings(
    settings: Partial<GenerationGlobalSettings>
  ): Promise<GenerationGlobalSettings> {
    const response = await window.api.orchestflowGenerationEditor.updateGlobalSettings(settings)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update global settings')
    }
    return response.data
  },

  async sendMessage(request: GenerationSendMessageRequest) {
    const response = await window.api.orchestflowGenerationEditor.sendMessage(request)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to send message')
    }
    return response.data
  },

  async abortMessage(requestId: string): Promise<void> {
    const response = await window.api.orchestflowGenerationEditor.abortMessage({ requestId })
    if (!response.success) {
      throw new Error(response.error || 'Failed to abort message')
    }
  },

  onStream(handler: (event: GenerationStreamEvent) => void): () => void {
    return window.api.orchestflowGenerationEditor.onStream(handler)
  }
}

export function resolveMenuByStage(
  stage: GenerationRuntimeStageKey
): 'analysis' | 'design' | 'verify' {
  if (stage === 'analysis') return 'analysis'
  if (stage === 'design') return 'design'
  return 'verify'
}
