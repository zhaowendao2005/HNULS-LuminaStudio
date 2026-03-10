import type { OFGenerationPhase, OFGenerationSession } from '@shared/Orchestraflow-types'
import { orchestraflowBridge } from '@main/services/orchestraflow-bridge'
import { logger } from '@main/services/logger'
import { GenerationSessionRepository } from './generation-session-repository'
import { createGenerationSession } from '@utility/orchestraflow/generation/phase-orchestrator'

const log = logger.scope('OFGenerationSessionService')

function createSessionId(name: string): string {
  const normalized =
    String(name || 'generation')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'generation'
  return `${normalized}-${Math.random().toString(36).slice(2, 8)}`
}

export class GenerationSessionService {
  constructor(private readonly repository: GenerationSessionRepository) {}

  listGenerationSessions(): OFGenerationSession[] {
    return this.repository.list().sort((a, b) => b.updated_at - a.updated_at)
  }

  getGenerationSession(id: string): OFGenerationSession | null {
    return this.repository.get(id)
  }

  createGenerationSession(data: {
    workflow_name: string
    description?: string
    prompt?: string
  }): OFGenerationSession {
    const session = createGenerationSession({
      id: createSessionId(data.workflow_name),
      workflow_name: data.workflow_name,
      description: data.description,
      prompt: data.prompt
    })
    return this.repository.save(session)
  }

  async sendGenerationPrompt(id: string, prompt: string): Promise<OFGenerationSession> {
    const session = this.requireSession(id)
    const next = await orchestraflowBridge.sendGenerationPrompt(session, prompt)
    return this.repository.save(next)
  }

  async advanceGenerationPhase(id: string, phase: OFGenerationPhase): Promise<OFGenerationSession> {
    const session = this.requireSession(id)
    const next = await orchestraflowBridge.advanceGenerationPhase(session, phase)
    return this.repository.save(next)
  }

  async rollbackGenerationCheckpoint(
    id: string,
    checkpointId: string
  ): Promise<OFGenerationSession> {
    const session = this.requireSession(id)
    const next = await orchestraflowBridge.rollbackGenerationCheckpoint(session, checkpointId)
    return this.repository.save(next)
  }

  updateGenerationPhaseModels(
    id: string,
    phaseModels: OFGenerationSession['phase_models']
  ): OFGenerationSession {
    const session = this.requireSession(id)
    const next = {
      ...session,
      phase_models: phaseModels,
      updated_at: Math.floor(Date.now() / 1000)
    }
    return this.repository.save(next)
  }

  deleteGenerationSession(id: string): boolean {
    return this.repository.delete(id)
  }

  private requireSession(id: string): OFGenerationSession {
    const session = this.repository.get(id)
    if (!session) {
      log.warn('Generation session not found', { id })
      throw new Error(`Generation session not found: ${id}`)
    }
    return session
  }
}
