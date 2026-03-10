export type OFGenerationValidationLevel = 'info' | 'warning' | 'error'

export interface OFGenerationValidationIssue {
  id: string
  level: OFGenerationValidationLevel
  type: string
  node_id?: string
  message: string
  suggested_action?: string
}

export interface OFGenerationValidationReport {
  ok: boolean
  issues: OFGenerationValidationIssue[]
  checked_at: number
}
