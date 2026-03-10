import type { OFWorkflowMeta } from './core-types'
import type { OFGenerationGraphState } from './generation-graph'
import type { OFGenerationOpLogEntry, OFGenerationCheckpoint } from './generation-oplog'
import type {
  OFGenerationPhase,
  OFGenerationPhaseModelConfig,
  OFGenerationPhaseState
} from './generation-phase'
import type { OFGenerationPreview } from './generation-preview'
import type { OFGenerationValidationReport } from './generation-validation'

export type OFGenerationSessionStatus =
  | 'draft'
  | 'running'
  | 'waiting-confirm'
  | 'confirmed'
  | 'failed'

export interface OFGenerationSessionMeta extends OFWorkflowMeta {
  session_status: OFGenerationSessionStatus
  current_phase: OFGenerationPhase
}

export interface OFGenerationSession {
  id: string
  workflow_name: string
  description?: string
  prompt: string
  status: OFGenerationSessionStatus
  current_phase: OFGenerationPhase
  phase_state: Record<OFGenerationPhase, OFGenerationPhaseState>
  phase_models: Record<OFGenerationPhase, OFGenerationPhaseModelConfig>
  graph_state: OFGenerationGraphState
  preview: OFGenerationPreview
  validation: OFGenerationValidationReport
  checkpoints: OFGenerationCheckpoint[]
  op_log: OFGenerationOpLogEntry[]
  compiled_workflow_id?: string
  created_at: number
  updated_at: number
}
