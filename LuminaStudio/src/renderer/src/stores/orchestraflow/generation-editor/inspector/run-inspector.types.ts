import type {
  GenerationBudgetEvent,
  GenerationContextSnapshotEvent,
  GenerationMemorySnapshotEvent,
  GenerationPromptSnapshotEvent,
  GenerationStreamEvent,
  GenerationValidationReportEvent
} from '@preload/types'

export interface RunInspectorRecord {
  runId: string
  status: 'running' | 'completed' | 'failed' | 'aborted'
  events: GenerationStreamEvent[]
  prompts: GenerationPromptSnapshotEvent[]
  contexts: GenerationContextSnapshotEvent[]
  memories: GenerationMemorySnapshotEvent[]
  validations: GenerationValidationReportEvent[]
  budgets: GenerationBudgetEvent[]
  lastError: string | null
}
