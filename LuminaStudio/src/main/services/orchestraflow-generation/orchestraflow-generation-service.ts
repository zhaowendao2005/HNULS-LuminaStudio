import type {
  OFGenerationPhase,
  OFGenerationSession,
  OFGenerationAgentId,
  OFGenerationAgentRuntimeConfig
} from '@shared/Orchestraflow-types'
import { GenerationSessionRepository } from './generation-session-repository'
import { GenerationSessionService } from './generation-session-service'
import { GenerationCompileService } from './generation-compile-service'
import { OrchestraflowWorkflowService } from '@main/services/orchestraflow/orchestraflow-workflow-service'
import type { ModelConfigService } from '@main/services/model-config'

export class OrchestraflowGenerationService {
  readonly repository: GenerationSessionRepository
  readonly sessionService: GenerationSessionService
  readonly compileService: GenerationCompileService

  constructor(
    workflowService: OrchestraflowWorkflowService,
    modelConfigService: ModelConfigService
  ) {
    this.repository = new GenerationSessionRepository()
    this.sessionService = new GenerationSessionService(this.repository, modelConfigService)
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

  async sendGenerationAgentMessage(
    id: string,
    agentId: OFGenerationAgentId,
    input: string
  ): Promise<OFGenerationSession> {
    return this.sessionService.sendGenerationAgentMessage(id, agentId, input)
  }

  async resolveGenerationApproval(
    id: string,
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ): Promise<OFGenerationSession> {
    return this.sessionService.resolveGenerationApproval(id, approvalId, decision, note)
  }

  async runGenerationStage(
    id: string,
    stage: 'draft' | 'plan' | 'topology' | 'validation'
  ): Promise<OFGenerationSession> {
    return this.sessionService.runGenerationStage(id, stage)
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

  updateGenerationAgentConfig(
    id: string,
    agentId: OFGenerationAgentId,
    patch: Partial<OFGenerationAgentRuntimeConfig>
  ): OFGenerationSession {
    return this.sessionService.updateGenerationAgentConfig(id, agentId, patch)
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
