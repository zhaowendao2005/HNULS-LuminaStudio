import type { GenerationValidationReport } from '@preload/types'

export interface DesignPlannerContext {
  analysisDocument: string
  currentToml: string
  workflowSpec: string
  nodePrompt: string
  validationReport?: GenerationValidationReport | null
}

export interface DesignPlannerResult {
  toml: string
  prompt: string
  context: string
}
