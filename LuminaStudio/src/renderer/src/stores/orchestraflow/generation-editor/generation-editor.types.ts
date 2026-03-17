import type {
  GenerationAnalysisDocument,
  GenerationMessage,
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

export const REQUIREMENT_PLANNING_SECTION_TITLES = [
  '\u6458\u8981',
  '\u76ee\u6807',
  '\u7ea6\u675f',
  '\u6210\u529f\u6807\u51c6'
] as const

export type RequirementPlanningSectionTitle = (typeof REQUIREMENT_PLANNING_SECTION_TITLES)[number]

export interface RequirementPlanningSection {
  title: RequirementPlanningSectionTitle
  content: string
}

export interface RequirementPlanningBlockViewModel {
  summaryText: string
  sections: Record<RequirementPlanningSectionTitle, RequirementPlanningSection>
}

// 把 analysis-planner 输出的 markdown 按固定标题切成 4 个规划块。
// 这里只认当前 prompt 约定的 4 个标题，避免把普通 markdown 误判成规划消息。
export function parseRequirementPlanningMarkdownSections(
  content: string
): Partial<Record<RequirementPlanningSectionTitle, RequirementPlanningSection>> {
  const lines = content.split(/\r?\n/)
  const sections: Partial<Record<RequirementPlanningSectionTitle, RequirementPlanningSection>> = {}
  let activeTitle: RequirementPlanningSectionTitle | null = null
  let buffer: string[] = []

  const flush = (): void => {
    if (!activeTitle) return
    sections[activeTitle] = {
      title: activeTitle,
      content: buffer.join('\n').trim()
    }
    buffer = []
  }

  for (const line of lines) {
    const heading = line.match(
      /^\s{0,3}#{1,6}\s*(\u6458\u8981|\u76ee\u6807|\u7ea6\u675f|\u6210\u529f\u6807\u51c6)\s*$/
    )
    if (heading) {
      flush()
      activeTitle = heading[1] as RequirementPlanningSectionTitle
      continue
    }

    if (!activeTitle) {
      continue
    }

    buffer.push(line)
  }

  flush()
  return sections
}

function buildRequirementPlanningSummary(
  sections: Partial<Record<RequirementPlanningSectionTitle, RequirementPlanningSection>>
): string {
  const summaryContent = sections['\u6458\u8981']?.content || ''
  return (
    summaryContent
      .split('\n')
      .map((line) => line.trim().replace(/^[-*]\s*/, ''))
      .filter(Boolean)
      .join(' ') ||
    '\u5df2\u8bc6\u522b\u5230\u9700\u6c42\u89c4\u5212\u7ed3\u6784\u5316\u8f93\u51fa\u3002'
  )
}

// 只对 analysis-planner 的 assistant 消息启用规划块识别。
// 4 个核心标题必须都齐，命中后才替换纯文本展示。
export function getRequirementPlanningBlock(
  message: GenerationMessage
): RequirementPlanningBlockViewModel | null {
  if (message.role !== 'assistant' || message.channelKey !== 'analysis-planner') {
    return null
  }

  const sections = parseRequirementPlanningMarkdownSections(message.content || '')
  const hasAllSections = REQUIREMENT_PLANNING_SECTION_TITLES.every((title) => {
    return Boolean(sections[title]?.content.trim())
  })

  if (!hasAllSections) {
    return null
  }

  return {
    summaryText: buildRequirementPlanningSummary(sections),
    sections: sections as Record<RequirementPlanningSectionTitle, RequirementPlanningSection>
  }
}
