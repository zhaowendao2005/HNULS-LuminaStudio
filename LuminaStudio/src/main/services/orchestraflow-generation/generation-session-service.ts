import type {
  OFGenerationPhase,
  OFGenerationSession,
  OFGenerationAgentId,
  OFGenerationAgentRuntimeConfig
} from '@shared/Orchestraflow-types'
import type { ModelConfigService, PersistedModelProviderConfig } from '@main/services/model-config'
import { randomUUID } from 'crypto'
import {
  normalizeOFGenerationSession,
  mapAgentConfigsToLegacyPhaseModels,
  normalizeOFGenerationAgentConfigs
} from '@shared/Orchestraflow-types'
import { createGenerationSession } from '@utility/orchestraflow/generation/phase-orchestrator'
import { orchestraflowBridge } from '@main/services/orchestraflow-bridge'
import { logger } from '@main/services/logger'
import { GenerationSessionRepository } from './generation-session-repository'

const log = logger.scope('OFGenerationSessionService')

function createSessionId(name: string): string {
  const normalized =
    String(name || 'generation')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'generation'
  return `${normalized}-${randomUUID().slice(0, 8)}`
}

export class GenerationSessionService {
  constructor(
    private readonly repository: GenerationSessionRepository,
    private readonly modelConfigService: ModelConfigService
  ) {}

  listGenerationSessions(): OFGenerationSession[] {
    return this.repository.list().sort((a, b) => b.updated_at - a.updated_at)
  }

  getGenerationSession(id: string): OFGenerationSession | null {
    const session = this.repository.get(id)
    return session ? normalizeOFGenerationSession(session) : null
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
    const next = await orchestraflowBridge.sendGenerationPrompt(
      session,
      prompt,
      await this.resolveProviderConfigs()
    )
    return this.repository.save(next)
  }

  async sendGenerationAgentMessage(
    id: string,
    agentId: OFGenerationAgentId,
    input: string
  ): Promise<OFGenerationSession> {
    const session = this.requireSession(id)
    const next = await orchestraflowBridge.sendGenerationAgentMessage(
      session,
      agentId,
      input,
      await this.resolveProviderConfigs()
    )
    return this.repository.save(next)
  }

  async resolveGenerationApproval(
    id: string,
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ): Promise<OFGenerationSession> {
    const session = this.requireSession(id)
    const next = await orchestraflowBridge.resolveGenerationApproval(
      session,
      approvalId,
      decision,
      note,
      await this.resolveProviderConfigs()
    )
    return this.repository.save(next)
  }

  async runGenerationStage(
    id: string,
    stage: 'draft' | 'plan' | 'topology' | 'validation'
  ): Promise<OFGenerationSession> {
    const session = this.requireSession(id)
    const next = await orchestraflowBridge.runGenerationStage(
      session,
      stage,
      await this.resolveProviderConfigs()
    )
    return this.repository.save(next)
  }

  async advanceGenerationPhase(id: string, phase: OFGenerationPhase): Promise<OFGenerationSession> {
    const session = this.requireSession(id)
    const next = await orchestraflowBridge.advanceGenerationPhase(
      session,
      phase,
      await this.resolveProviderConfigs()
    )
    return this.repository.save(next)
  }

  async rollbackGenerationCheckpoint(
    id: string,
    checkpointId: string
  ): Promise<OFGenerationSession> {
    const session = this.requireSession(id)
    const next = await orchestraflowBridge.rollbackGenerationCheckpoint(
      session,
      checkpointId,
      await this.resolveProviderConfigs()
    )
    return this.repository.save(next)
  }

  updateGenerationPhaseModels(
    id: string,
    phaseModels: OFGenerationSession['phase_models']
  ): OFGenerationSession {
    const session = this.requireSession(id)
    const agent_configs = normalizeOFGenerationAgentConfigs(session.agent_configs, phaseModels)
    const next = normalizeOFGenerationSession({
      ...session,
      phase_models: mapAgentConfigsToLegacyPhaseModels(agent_configs),
      agent_configs,
      updated_at: Math.floor(Date.now() / 1000)
    })
    return this.repository.save(next)
  }

  updateGenerationAgentConfig(
    id: string,
    agentId: OFGenerationAgentId,
    patch: Partial<OFGenerationAgentRuntimeConfig>
  ): OFGenerationSession {
    const session = this.requireSession(id)
    const agent_configs = normalizeOFGenerationAgentConfigs(
      {
        ...session.agent_configs,
        [agentId]: {
          ...session.agent_configs[agentId],
          ...patch,
          agent_id: agentId
        }
      },
      session.phase_models
    )
    const next = normalizeOFGenerationSession({
      ...session,
      agent_configs,
      phase_models: mapAgentConfigsToLegacyPhaseModels(agent_configs),
      updated_at: Math.floor(Date.now() / 1000)
    })
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
    return normalizeOFGenerationSession(session)
  }

  private async resolveProviderConfigs(): Promise<
    Record<
      string,
      PersistedModelProviderConfig
    >
  > {
    const config = await this.modelConfigService.getConfig()
    const providers: Record<string, PersistedModelProviderConfig> = {}
    for (const provider of config.providers) {
      providers[provider.id] = provider
    }
    return providers
  }
}
