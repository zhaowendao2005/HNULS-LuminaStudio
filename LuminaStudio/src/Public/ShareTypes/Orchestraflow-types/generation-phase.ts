import type { OFModelConfig } from './core-types'
import {
  getOFDefaultGenerationAgentConfigs,
  OF_GENERATION_AGENT_PHASE_COMPAT,
  type OFGenerationAgentId,
  type OFGenerationAgentRuntimeConfig
} from './generation-agent'

export type OFGenerationPhase = 'plan' | 'wire' | 'config' | 'validate'
export type OFGenerationPhaseStatus =
  | 'idle'
  | 'running'
  | 'waiting-confirm'
  | 'failed'
  | 'completed'

export interface OFGenerationPhaseModelConfig {
  phase: OFGenerationPhase
  provider?: string
  model?: string
  temperature?: number
  enabled?: boolean
  fallback_model?: string
}

export interface OFGenerationPhaseState {
  phase: OFGenerationPhase
  status: OFGenerationPhaseStatus
  started_at?: number
  completed_at?: number
  error?: string
}

export interface OFGenerationPhaseAdvanceRequest {
  session_id: string
  phase: OFGenerationPhase
  prompt?: string
}

export function getOFDefaultGenerationPhaseModels(): Record<
  OFGenerationPhase,
  OFGenerationPhaseModelConfig
> {
  return {
    plan: { phase: 'plan', enabled: true, temperature: 0.2 },
    wire: { phase: 'wire', enabled: true, temperature: 0.1 },
    config: { phase: 'config', enabled: true, temperature: 0.1 },
    validate: { phase: 'validate', enabled: true, temperature: 0 }
  }
}

export function normalizeOFGenerationPhaseModels(
  source?: Partial<Record<OFGenerationPhase, OFGenerationPhaseModelConfig | OFModelConfig>>
): Record<OFGenerationPhase, OFGenerationPhaseModelConfig> {
  const defaults = getOFDefaultGenerationPhaseModels()
  if (!source) return defaults
  const next = { ...defaults }
  for (const phase of Object.keys(defaults) as OFGenerationPhase[]) {
    const value = source[phase]
    if (!value) continue
    next[phase] = {
      ...defaults[phase],
      phase,
      provider: 'provider' in value ? value.provider : defaults[phase].provider,
      model: 'name' in value ? value.name : value.model,
      temperature:
        'completion_params' in value
          ? value.completion_params?.temperature
          : 'temperature' in value
            ? value.temperature
            : defaults[phase].temperature,
      enabled: 'enabled' in value ? value.enabled : true,
      fallback_model:
        'fallback_model' in value ? value.fallback_model : defaults[phase].fallback_model
    }
  }
  return next
}

export function normalizeOFGenerationAgentConfigs(
  source?: Partial<Record<OFGenerationAgentId, Partial<OFGenerationAgentRuntimeConfig>>>,
  legacyPhaseModels?: Partial<
    Record<OFGenerationPhase, OFGenerationPhaseModelConfig | OFModelConfig>
  >
): Record<OFGenerationAgentId, OFGenerationAgentRuntimeConfig> {
  const compatPhaseModels = normalizeOFGenerationPhaseModels(legacyPhaseModels)
  const defaults = getOFDefaultGenerationAgentConfigs(compatPhaseModels)
  if (!source) return defaults

  return {
    draft_chat: {
      ...defaults.draft_chat,
      ...source.draft_chat,
      agent_id: 'draft_chat'
    },
    plan_panel: {
      ...defaults.plan_panel,
      ...source.plan_panel,
      agent_id: 'plan_panel'
    },
    topology_graph: {
      ...defaults.topology_graph,
      ...source.topology_graph,
      agent_id: 'topology_graph'
    }
  }
}

export function mapAgentConfigsToLegacyPhaseModels(
  agentConfigs?: Partial<Record<OFGenerationAgentId, Partial<OFGenerationAgentRuntimeConfig>>>
): Record<OFGenerationPhase, OFGenerationPhaseModelConfig> {
  const normalizedAgents = normalizeOFGenerationAgentConfigs(agentConfigs)
  const defaults = getOFDefaultGenerationPhaseModels()
  const next = { ...defaults }

  for (const phase of Object.keys(next) as OFGenerationPhase[]) {
    const agentId = OF_GENERATION_AGENT_PHASE_COMPAT[phase]
    const agentConfig = normalizedAgents[agentId]
    next[phase] = {
      ...next[phase],
      phase,
      provider: agentConfig.provider,
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      enabled: agentConfig.enabled
    }
  }

  return next
}
