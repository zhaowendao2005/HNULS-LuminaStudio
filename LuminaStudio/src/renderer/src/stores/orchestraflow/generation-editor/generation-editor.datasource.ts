import type {
  GenerationCreateSessionRequest,
  GenerationDeleteSessionRequest,
  GenerationGlobalSettings,
  GenerationRuntimeStageKey,
  GenerationSaveDocumentRequest,
  GenerationSaveStageConfigRequest,
  GenerationSendMessageRequest,
  GenerationSessionDetail,
  GenerationSessionSummary,
  GenerationStreamEvent,
  GenerationUpdateSessionStateRequest
} from '@preload/types'

/**
 * 根 datasource 现在只做“共享后端访问入口”。
 *
 * 各业务域 datasource 可以直接复用这里的方法，
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
