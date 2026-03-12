import type {
  GenerationChannelKey,
  GenerationDocument,
  GenerationMessage,
  GenerationMessageMetaPayload,
  GenerationPlanningBlockPayload,
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

/**
 * 生成编辑器当前只有 planning block 这一种结构化消息元数据。
 * 后面如果继续扩展别的 block，也统一从这里加解析入口。
 */
export function parseGenerationMessageMeta(
  metaJson: string | null
): GenerationMessageMetaPayload | null {
  if (!metaJson) {
    return null
  }

  try {
    return JSON.parse(metaJson) as GenerationMessageMetaPayload
  } catch {
    return null
  }
}

export function getGenerationPlanningBlock(
  message: Pick<GenerationMessage, 'metaJson'>
): GenerationPlanningBlockPayload | null {
  const meta = parseGenerationMessageMeta(message.metaJson)
  if (meta?.planningBlock?.kind === 'analysis-planning') {
    return meta.planningBlock
  }
  return null
}
