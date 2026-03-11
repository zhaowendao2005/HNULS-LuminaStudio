import type {
  GenerationChannelKey,
  GenerationDocument,
  GenerationMessage,
  GenerationRuntimeStageKey,
  GenerationSessionDetail,
  GenerationSessionSummary,
  GenerationStageConfig,
  GenerationStageKey
} from '@preload/types'

export type GenerateMenuValue =
  | 'dashboard'
  | 'sessions'
  | 'analysis'
  | 'design'
  | 'verify'
  | 'settings'
export type GenerateCopilotMode = 'analysis' | 'design' | 'verify'

export interface GenerateSessionViewModel {
  id: string
  title: string
  currentStage: GenerationRuntimeStageKey
  summary: string
  analysisTurnCount: number
  planGenerated: boolean
  createdAt: string
  updatedAt: string
}

export interface GenerateSessionDetailViewModel extends GenerateSessionViewModel {
  stageConfigs: Record<GenerationStageKey, GenerationStageConfig>
  documents: Record<GenerationStageKey, GenerationDocument>
  messagesByChannel: Record<GenerationChannelKey, GenerationMessage[]>
}

export interface GenerateStoreStateSnapshot {
  sessions: GenerateSessionViewModel[]
  selectedSessionId: string | null
  activeMenu: GenerateMenuValue
  activeRightPanel: GenerateCopilotMode | null
}

export function mapSessionSummary(
  session: GenerationSessionSummary | GenerationSessionDetail
): GenerateSessionViewModel {
  return {
    id: session.id,
    title: session.title,
    currentStage: session.currentStage,
    summary: session.summary,
    analysisTurnCount: session.analysisTurnCount,
    planGenerated: session.planGenerated,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  }
}

export function mapSessionDetail(session: GenerationSessionDetail): GenerateSessionDetailViewModel {
  return {
    ...mapSessionSummary(session),
    stageConfigs: {
      analysis: session.stageConfigs.find((item) => item.stageKey === 'analysis')!,
      design: session.stageConfigs.find((item) => item.stageKey === 'design')!,
      verify: session.stageConfigs.find((item) => item.stageKey === 'verify')!
    },
    documents: {
      analysis: session.documents.find((item) => item.documentKey === 'analysis')!,
      design: session.documents.find((item) => item.documentKey === 'design')!,
      verify: session.documents.find((item) => item.documentKey === 'verify')!
    },
    messagesByChannel: {
      'analysis-discussion': session.messages.filter(
        (item) => item.channelKey === 'analysis-discussion'
      ),
      'analysis-copilot': session.messages.filter((item) => item.channelKey === 'analysis-copilot'),
      'design-copilot': session.messages.filter((item) => item.channelKey === 'design-copilot'),
      'verify-copilot': session.messages.filter((item) => item.channelKey === 'verify-copilot')
    }
  }
}
