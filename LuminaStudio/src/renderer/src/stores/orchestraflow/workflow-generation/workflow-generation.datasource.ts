import type {
  OFGenerationPhase,
  OFGenerationPhaseModelConfig,
  OFGenerationSession
} from '@shared/Orchestraflow-types'

export class WorkflowGenerationDatasource {
  async listSessions(): Promise<OFGenerationSession[]> {
    const res = await window.api.orchestraflow.listGenerationSessions()
    if (!res.success || !res.data)
      throw new Error(res.error || 'Failed to list generation sessions')
    return res.data
  }

  async getSession(sessionId: string): Promise<OFGenerationSession> {
    const res = await window.api.orchestraflow.getGenerationSession(sessionId)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to load generation session')
    return res.data
  }

  async createSession(data: {
    workflow_name: string
    description?: string
    prompt?: string
  }): Promise<OFGenerationSession> {
    const res = await window.api.orchestraflow.createGenerationSession(data)
    if (!res.success || !res.data)
      throw new Error(res.error || 'Failed to create generation session')
    return res.data
  }

  async sendPrompt(sessionId: string, prompt: string): Promise<OFGenerationSession> {
    const res = await window.api.orchestraflow.sendGenerationPrompt(sessionId, prompt)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to send prompt')
    return res.data
  }

  async advancePhase(sessionId: string, phase: OFGenerationPhase): Promise<OFGenerationSession> {
    const res = await window.api.orchestraflow.advanceGenerationPhase(sessionId, phase)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to advance phase')
    return res.data
  }

  async rollbackCheckpoint(sessionId: string, checkpointId: string): Promise<OFGenerationSession> {
    const res = await window.api.orchestraflow.rollbackGenerationCheckpoint(sessionId, checkpointId)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to rollback checkpoint')
    return res.data
  }

  async updatePhaseModels(
    sessionId: string,
    phaseModels: Record<OFGenerationPhase, OFGenerationPhaseModelConfig>
  ): Promise<OFGenerationSession> {
    const res = await window.api.orchestraflow.updateGenerationPhaseModels(sessionId, phaseModels)
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to update phase models')
    return res.data
  }

  async confirmSession(
    sessionId: string
  ): Promise<{ session: OFGenerationSession; workflowId: string }> {
    const res = await window.api.orchestraflow.confirmGenerationSession(sessionId)
    if (!res.success || !res.data)
      throw new Error(res.error || 'Failed to confirm generation session')
    return res.data
  }

  async deleteSession(sessionId: string): Promise<void> {
    const res = await window.api.orchestraflow.deleteGenerationSession(sessionId)
    if (!res.success) throw new Error(res.error || 'Failed to delete generation session')
  }
}
