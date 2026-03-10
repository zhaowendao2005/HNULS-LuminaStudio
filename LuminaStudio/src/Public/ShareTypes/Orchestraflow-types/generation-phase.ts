import type { OFModelConfig } from './core-types'

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
  const defaults: Record<OFGenerationPhase, OFGenerationPhaseModelConfig> = {
    plan: { phase: 'plan', enabled: true, temperature: 0.2 },
    wire: { phase: 'wire', enabled: true, temperature: 0.1 },
    config: { phase: 'config', enabled: true, temperature: 0.1 },
    validate: { phase: 'validate', enabled: true, temperature: 0 }
  }
  return defaults
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
