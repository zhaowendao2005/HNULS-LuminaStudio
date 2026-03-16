import type {
  GenerationAnalysisDocument,
  GenerationDesignDocument,
  GenerationSessionDetail,
  GenerationSessionSummary,
  GenerationStageKey
} from '@preload/types'

export type GenerateMenuValue = 'sessions' | 'analysis' | 'design' | 'settings'

export interface GenerateStageCard {
  stageKey: GenerationStageKey
  title: string
  summary: string
}

export interface GenerateViewState {
  sessions: GenerationSessionSummary[]
  currentSession: GenerationSessionDetail | null
  activeMenu: GenerateMenuValue
}

export interface GenerateComposerState {
  analysisInput: string
  planningCopilotInput: string
  designInput: string
}

export interface GenerateDesignViewModel {
  activeDocument: GenerationDesignDocument | null
  documents: GenerationDesignDocument[]
  analysisDocument: GenerationAnalysisDocument | null
}
