import type { OFGenerationPhase } from './generation-phase'

export type OFGenerationOpKind =
  | 'PROMPT_SET'
  | 'PLAN_SET'
  | 'WIRE_BATCH'
  | 'CONFIG_BATCH'
  | 'EDIT_BATCH'
  | 'ROLLBACK'
  | 'VALIDATION_SET'
  | 'CONFIRM_COMPILE'

export interface OFGenerationOpLogEntry {
  id: string
  session_id: string
  phase: OFGenerationPhase
  kind: OFGenerationOpKind
  summary: string
  payload?: Record<string, unknown>
  created_at: number
}

export interface OFGenerationCheckpoint {
  id: string
  session_id: string
  label: string
  phase: OFGenerationPhase
  op_index: number
  created_at: number
}
