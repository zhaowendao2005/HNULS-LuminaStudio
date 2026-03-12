import type {
  GenerationChannelKey,
  GenerationDocument,
  GenerationMessage,
  GenerationMessageMetaPayload,
  GenerationPlanningBlockPayload,
  GenerationPlanningStreamSectionKey,
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
export type GenerateViewStatus = 'bootstrapping' | 'ready' | 'switching' | 'error'

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

export interface GeneratePlanningMarkdownSection {
  title: string
  content: string
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
  // message block 的展示必须跟随 mode=planning。
  // 即使历史数据或异常流式过程里残留了 planningBlock，只要当前 mode 不是 planning，
  // Generate 面板也不应该继续把它当成有效规划块渲染出来。
  if (meta?.mode === 'planning' && meta?.planningBlock?.kind === 'analysis-planning') {
    return normalizePlanningBlock(meta.planningBlock)
  }
  return null
}

export function normalizePlanningBlock(
  planningBlock: GenerationPlanningBlockPayload
): GenerationPlanningBlockPayload {
  if (planningBlock.analysisMarkdown || planningBlock.designMarkdown) {
    return planningBlock
  }

  const legacy = planningBlock.requirementDocument
  return {
    ...planningBlock,
    analysisMarkdown: legacy
      ? [
          '# 需求分析',
          '## 摘要',
          '- 旧消息迁移：该规划块来自 v1 requirementDocument 结构。',
          '## 目标',
          ...toMarkdownList(legacy.goals),
          '## 成功标准',
          ...toMarkdownList(legacy.success_criteria),
          '## 约束',
          ...toMarkdownList(legacy.constraints),
          '## 禁止项',
          ...toMarkdownList(legacy.prohibitions),
          '## 待补充信息',
          '- 暂无',
          '## 成熟度信号',
          '- 暂无'
        ].join('\n')
      : '',
    designMarkdown: legacy
      ? [
          '# 设计交接',
          '## 候选节点',
          ...toMarkdownList(legacy.candidate_nodes.map((item) => `${item.type}：${item.reason}`)),
          '## 输入要求',
          ...toMarkdownList(legacy.input_requirements),
          '## 输出要求',
          ...toMarkdownList(legacy.output_requirements),
          '## 待确认问题',
          ...toMarkdownList(legacy.human_confirmation_questions),
          '## 蓝图要求',
          ...toMarkdownList(legacy.blueprint_requirements)
        ].join('\n')
      : ''
  }
}

export function parsePlanningMarkdownSections(
  markdown: string
): Record<string, GeneratePlanningMarkdownSection> {
  if (!markdown.trim()) {
    return {}
  }

  const sectionRegex = /^##\s+(.+?)\s*$([\s\S]*?)(?=^##\s+|^#\s+|$)/gm
  const sections: Record<string, GeneratePlanningMarkdownSection> = {}

  for (const match of markdown.matchAll(sectionRegex)) {
    const title = match[1].trim()
    const content = match[2].trim()
    sections[title] = {
      title,
      content
    }
  }

  return sections
}

export function getPlanningActiveRootSection(
  sectionKey: GenerationPlanningStreamSectionKey
): 'analysis' | 'design' {
  return sectionKey.startsWith('analysis-') ? 'analysis' : 'design'
}

function toMarkdownList(items: string[]): string[] {
  if (!items.length) {
    return ['- 暂无']
  }
  return items.map((item) => `- ${item}`)
}
