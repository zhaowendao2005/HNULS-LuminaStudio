import type { OFGenerationPhase, OFGenerationPhaseModelConfig } from '@shared/Orchestraflow-types'

export function resolveGenerationPhaseModel(
  phase: OFGenerationPhase,
  config: Record<OFGenerationPhase, OFGenerationPhaseModelConfig>
): OFGenerationPhaseModelConfig {
  return config[phase]
}
