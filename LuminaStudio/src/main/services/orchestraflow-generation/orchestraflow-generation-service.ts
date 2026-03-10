import type { OFGenerationPhase, OFGenerationSession } from '@shared/Orchestraflow-types'
import { GenerationSessionRepository } from './generation-session-repository'
import { GenerationSessionService } from './generation-session-service'
import { GenerationCompileService } from './generation-compile-service'
import { OrchestraflowWorkflowService } from '@main/services/orchestraflow/orchestraflow-workflow-service'

export class OrchestraflowGenerationService {
  readonly repository: GenerationSessionRepository
  readonly sessionService: GenerationSessionService
  readonly compileService: GenerationCompileService

  constructor(workflowService: OrchestraflowWorkflowService) {
    this.repository = new GenerationSessionRepository()
    this.sessionService = new GenerationSessionService(this.repository)
    this.compileService = new GenerationCompileService(workflowService)
  }

  listGenerationSessions(): OFGenerationSession[] {
    return this.sessionService.listGenerationSessions()
  }

  getGenerationSession(id: string): OFGenerationSession | null {
    return this.sessionService.getGenerationSession(id)
  }

  createGenerationSession(data: {
    workflow_name: string
    description?: string
    prompt?: string
  }): OFGenerationSession {
    return this.sessionService.createGenerationSession(data)
  }

  async sendGenerationPrompt(id: string, prompt: string): Promise<OFGenerationSession> {
    return this.sessionService.sendGenerationPrompt(id, prompt)
  }

  async advanceGenerationPhase(id: string, phase: OFGenerationPhase): Promise<OFGenerationSession> {
    return this.sessionService.advanceGenerationPhase(id, phase)
  }

  async rollbackGenerationCheckpoint(
    id: string,
    checkpointId: string
  ): Promise<OFGenerationSession> {
    return this.sessionService.rollbackGenerationCheckpoint(id, checkpointId)
  }

  updateGenerationPhaseModels(
    id: string,
    phaseModels: OFGenerationSession['phase_models']
  ): OFGenerationSession {
    return this.sessionService.updateGenerationPhaseModels(id, phaseModels)
  }

  async confirmGenerationSession(
    id: string
  ): Promise<{ session: OFGenerationSession; workflowId: string }> {
    const session = this.sessionService.getGenerationSession(id)
    if (!session) throw new Error(`Generation session not found: ${id}`)
    const compiled = await this.compileService.confirmGenerationSession(session)
    this.repository.save(compiled.session)
    return compiled
  }

  deleteGenerationSession(id: string): boolean {
    return this.sessionService.deleteGenerationSession(id)
  }
}
