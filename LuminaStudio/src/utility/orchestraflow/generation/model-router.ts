import type {
  OFGenerationPhase,
  OFGenerationPhaseModelConfig,
  OFGenerationAgentId,
  OFGenerationAgentRuntimeConfig
} from '@shared/Orchestraflow-types'
import { OF_GENERATION_AGENT_PHASE_COMPAT } from '@shared/Orchestraflow-types'

export function resolveGenerationPhaseModel(
  phase: OFGenerationPhase,
  config: Record<OFGenerationPhase, OFGenerationPhaseModelConfig>
): OFGenerationPhaseModelConfig {
  return config[phase]
}

export function resolveGenerationAgentConfig(
  agentId: OFGenerationAgentId,
  config: Record<OFGenerationAgentId, OFGenerationAgentRuntimeConfig>
): OFGenerationAgentRuntimeConfig {
  return config[agentId]
}

export function resolveGenerationAgentFromPhase(phase: OFGenerationPhase): OFGenerationAgentId {
  return OF_GENERATION_AGENT_PHASE_COMPAT[phase]
}
