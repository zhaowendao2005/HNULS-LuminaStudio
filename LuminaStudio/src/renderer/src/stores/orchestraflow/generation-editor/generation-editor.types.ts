import {
  OF_PLANNING_SECTION_DEFINITIONS,
  applyOFPlanningEditCommands,
  buildOFPlanningMarkdown,
  parseOFPlanningMarkdown
} from '@shared/Orchestraflow-types'
import type {
  OFBlueprintTextDiagnostic,
  OFPlanningEditCommand,
  OFPlanningSectionKey,
  OFPlanningSectionDefinition,
  OFPlanningValidationError
} from '@shared/Orchestraflow-types'
import type {
  GenerationChannelKey,
  GenerationCopilotEditBlockPayload,
  GenerationDesignBlueprintBlockPayload,
  GenerationDesignDocument,
  GenerationMessage,
  GenerationMessageMetaPayload,
  GenerationPlanningBlockPayload,
  GenerationPlanningDocument,
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
export type GenerateAnalysisPlanningViewMode = 'preview' | 'source' | 'diff'
export type GenerateDesignDocumentViewMode = 'snapshot' | 'dsl'

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
  documents: Record<GenerationStageKey, GenerationDocumentViewModel>
  planningDocuments: Record<string, GenerationPlanningDocument>
  designDocuments: Record<string, GenerationDesignDocument>
  messagesByChannel: Record<GenerationChannelKey, GenerationMessage[]>
}

export interface GenerationDocumentViewModel {
  documentKey: GenerationStageKey
  title: string
  fileName: string
  summary: string
  content: string
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
  definition?: OFPlanningSectionDefinition
}

export interface GeneratePlanningReviewEntry {
  messageId: string
  block: GenerationCopilotEditBlockPayload
}

export interface GeneratePlanningSectionReview {
  messageId: string
  sectionKey: OFPlanningSectionKey
  sectionTitle: string
  currentContent: string
  proposedContent: string
}

export interface GeneratePlanningReviewState {
  reviewEntry: GeneratePlanningReviewEntry | null
  displayDocument: GenerationPlanningDocument
  diffSourceMarkdown: string
  diffCurrentMarkdown: string
  isPendingReview: boolean
  isSourceEditable: boolean
  reviewErrorMessage: string | null
}

export interface GeneratePlanningDiffRow {
  beforeText: string
  afterText: string
  beforeType: 'removed' | 'unchanged' | 'empty'
  afterType: 'added' | 'unchanged' | 'empty'
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
    planningDocuments: Object.fromEntries(
      session.planningDocuments.map((document) => [document.id, document])
    ),
    designDocuments: Object.fromEntries(
      session.designDocuments.map((document) => [document.id, document])
    ),
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
 * 生成编辑器当前有 planning block 与 copilot edit block 两种结构化元数据。
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
  message: Pick<GenerationMessage, 'metaJson'>,
  planningDocuments: Record<string, GenerationPlanningDocument> = {}
): GenerationPlanningBlockPayload | null {
  const meta = parseGenerationMessageMeta(message.metaJson)
  if (meta?.mode === 'planning' && meta?.planningBlock?.kind === 'analysis-planning') {
    const normalized = normalizePlanningBlock(meta.planningBlock)
    if (normalized.documentId && planningDocuments[normalized.documentId]) {
      const document = planningDocuments[normalized.documentId]
      const roots = splitPlanningMarkdownByRoots(document.content)
      return {
        ...normalized,
        analysisMarkdown: roots.analysisMarkdown,
        designMarkdown: roots.designMarkdown
      }
    }
    return normalized
  }
  return null
}

export function getGenerationCopilotEditBlock(
  message: Pick<GenerationMessage, 'metaJson'>
): GenerationCopilotEditBlockPayload | null {
  const meta = parseGenerationMessageMeta(message.metaJson)
  if (meta?.copilotEditBlock?.kind === 'planning-edit') {
    return meta.copilotEditBlock
  }
  return null
}

export function getGenerationDesignBlueprintBlock(
  message: Pick<GenerationMessage, 'metaJson'>
): GenerationDesignBlueprintBlockPayload | null {
  const meta = parseGenerationMessageMeta(message.metaJson)
  if (meta?.designBlueprintBlock?.kind === 'design-blueprint-generation') {
    return meta.designBlueprintBlock
  }
  return null
}

export function parseDesignDiagnosticsJson(
  diagnosticsJson: string | null
): OFBlueprintTextDiagnostic[] {
  if (!diagnosticsJson) {
    return []
  }

  try {
    return JSON.parse(diagnosticsJson) as OFBlueprintTextDiagnostic[]
  } catch {
    return []
  }
}

export function getPendingGenerationCopilotSectionKeys(
  block: GenerationCopilotEditBlockPayload
): OFPlanningSectionKey[] {
  if (block.status !== 'pending') {
    return []
  }

  return block.affectedSectionKeys.filter((sectionKey) => {
    return (block.sectionDecisionByKey?.[sectionKey] || 'pending') === 'pending'
  })
}

export function getLatestGenerationPlanningReviewEntry(
  messages: GenerationMessage[],
  documentId: string
): GeneratePlanningReviewEntry | null {
  // 这里按消息时间倒序取最后一条 review block，确保文档区只围绕“当前最新一轮修改”审阅。
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    const block = getGenerationCopilotEditBlock(message)
    if (!block || block.documentId !== documentId) {
      continue
    }
    return {
      messageId: message.id,
      block
    }
  }
  return null
}

export function getPendingGenerationPlanningSectionReviews(params: {
  document: GenerationPlanningDocument
  messages: GenerationMessage[]
}): GeneratePlanningSectionReview[] {
  const sourceDocument = parseOFPlanningMarkdown(params.document.sourceMarkdown).document
  const reviews: GeneratePlanningSectionReview[] = []

  params.messages.forEach((message) => {
    const block = getGenerationCopilotEditBlock(message)
    if (!block || block.documentId !== params.document.id) {
      return
    }

    const pendingSectionKeys = getPendingGenerationCopilotSectionKeys(block)
    pendingSectionKeys.forEach((sectionKey) => {
      const proposedDocument = applyOFPlanningEditCommands(
        { sections: { ...params.document.sections } },
        filterPlanningCommandsBySectionKey(block.commands, sectionKey),
        { sourceDocument }
      )
      const definition = OF_PLANNING_SECTION_DEFINITIONS.find((item) => item.key === sectionKey)
      reviews.push({
        messageId: message.id,
        sectionKey,
        sectionTitle: definition?.title || sectionKey,
        currentContent: params.document.sections[sectionKey] || '',
        proposedContent: proposedDocument.sections[sectionKey] || ''
      })
    })
  })

  return reviews
}

export function buildPlanningReviewState(params: {
  document: GenerationPlanningDocument
  messages: GenerationMessage[]
}): GeneratePlanningReviewState {
  const reviewEntry = getLatestGenerationPlanningReviewEntry(params.messages, params.document.id)

  if (!reviewEntry) {
    return {
      reviewEntry: null,
      displayDocument: params.document,
      diffSourceMarkdown: params.document.sourceMarkdown,
      diffCurrentMarkdown: params.document.content,
      isPendingReview: false,
      isSourceEditable: true,
      reviewErrorMessage: null
    }
  }

  if (reviewEntry.block.status !== 'pending') {
    return {
      reviewEntry,
      displayDocument: params.document,
      diffSourceMarkdown: params.document.sourceMarkdown,
      diffCurrentMarkdown: params.document.content,
      isPendingReview: false,
      isSourceEditable: true,
      reviewErrorMessage:
        reviewEntry.block.status === 'failed' ? reviewEntry.block.errorMessage || null : null
    }
  }

  // pending 阶段先在前端本地预演 proposed draft，文档区据此展示 preview/source/diff，
  // 这样用户看到的是“待接受版本”，而不是已保存的当前版本。
  const sourceDocument = parseOFPlanningMarkdown(params.document.sourceMarkdown).document
  const nextSharedDocument = applyOFPlanningEditCommands(
    { sections: { ...params.document.sections } },
    reviewEntry.block.commands,
    { sourceDocument }
  )
  const proposedMarkdown = buildOFPlanningMarkdown(nextSharedDocument)
  const proposedDocument: GenerationPlanningDocument = {
    ...params.document,
    sections: nextSharedDocument.sections,
    content: proposedMarkdown
  }

  return {
    reviewEntry,
    displayDocument: proposedDocument,
    diffSourceMarkdown: params.document.content,
    diffCurrentMarkdown: proposedDocument.content,
    isPendingReview: true,
    isSourceEditable: false,
    reviewErrorMessage: null
  }
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

  const sections: Record<string, GeneratePlanningMarkdownSection> = {}
  const lines = markdown.split('\n')
  let currentTitle: string | null = null
  let currentContentLines: string[] = []

  function flushCurrentSection(): void {
    if (!currentTitle) {
      return
    }
    const definition = OF_PLANNING_SECTION_DEFINITIONS.find((item) => item.title === currentTitle)
    sections[currentTitle] = {
      title: currentTitle,
      content: currentContentLines.join('\n').trim(),
      definition
    }
  }

  for (const line of lines) {
    if (line.startsWith('# ')) {
      flushCurrentSection()
      currentTitle = null
      currentContentLines = []
      continue
    }

    if (line.startsWith('## ')) {
      flushCurrentSection()
      currentTitle = line.slice(3).trim()
      currentContentLines = []
      continue
    }

    if (currentTitle) {
      currentContentLines.push(line)
    }
  }

  flushCurrentSection()
  return sections
}

export function splitPlanningMarkdownByRoots(markdown: string): {
  analysisMarkdown: string
  designMarkdown: string
} {
  return {
    analysisMarkdown: extractRootMarkdownSection(markdown, '需求分析') || '# 需求分析\n',
    designMarkdown: extractRootMarkdownSection(markdown, '设计交接') || '# 设计交接\n'
  }
}

export function getPlanningActiveRootSection(
  sectionKey: OFPlanningSectionKey
): 'analysis' | 'design' {
  return sectionKey.startsWith('analysis-') ? 'analysis' : 'design'
}

export function buildPlanningDiffLines(params: {
  sourceMarkdown: string
  currentMarkdown: string
}): Array<{ type: 'added' | 'removed' | 'unchanged'; text: string }> {
  const sourceLines = params.sourceMarkdown.split('\n')
  const currentLines = params.currentMarkdown.split('\n')
  const maxLines = Math.max(sourceLines.length, currentLines.length)
  const diffLines: Array<{ type: 'added' | 'removed' | 'unchanged'; text: string }> = []

  for (let index = 0; index < maxLines; index += 1) {
    const sourceLine = sourceLines[index] ?? null
    const currentLine = currentLines[index] ?? null

    if (sourceLine === currentLine && sourceLine !== null) {
      diffLines.push({ type: 'unchanged', text: sourceLine })
      continue
    }

    if (sourceLine !== null) {
      diffLines.push({ type: 'removed', text: sourceLine })
    }

    if (currentLine !== null) {
      diffLines.push({ type: 'added', text: currentLine })
    }
  }

  return diffLines
}

export function buildPlanningDiffRows(params: {
  sourceMarkdown: string
  currentMarkdown: string
}): GeneratePlanningDiffRow[] {
  const sourceLines = params.sourceMarkdown.split('\n')
  const currentLines = params.currentMarkdown.split('\n')
  const maxLines = Math.max(sourceLines.length, currentLines.length)
  const rows: GeneratePlanningDiffRow[] = []

  for (let index = 0; index < maxLines; index += 1) {
    const sourceLine = sourceLines[index] ?? ''
    const currentLine = currentLines[index] ?? ''

    if (sourceLine === currentLine) {
      rows.push({
        beforeText: sourceLine,
        afterText: currentLine,
        beforeType: sourceLine ? 'unchanged' : 'empty',
        afterType: currentLine ? 'unchanged' : 'empty'
      })
      continue
    }

    rows.push({
      beforeText: sourceLine,
      afterText: currentLine,
      beforeType: sourceLine ? 'removed' : 'empty',
      afterType: currentLine ? 'added' : 'empty'
    })
  }

  return rows
}

export function formatPlanningValidationErrors(errors: OFPlanningValidationError[]): string {
  return errors.map((error) => error.message).join('；')
}

function extractRootMarkdownSection(payloadBody: string, title: string): string {
  if (!payloadBody.trim()) {
    return ''
  }

  const lines = payloadBody.split('\n')
  const header = `# ${title}`
  const startIndex = lines.findIndex((line) => line.trim() === header)
  if (startIndex < 0) {
    return ''
  }

  const contentLines: string[] = [header]
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const currentLine = lines[index]
    if (currentLine.startsWith('# ')) {
      break
    }
    contentLines.push(currentLine)
  }

  return contentLines.join('\n').trim()
}

function toMarkdownList(items: string[]): string[] {
  if (!items.length) {
    return ['- 暂无']
  }
  return items.map((item) => `- ${item}`)
}

function filterPlanningCommandsBySectionKey(
  commands: OFPlanningEditCommand[],
  sectionKey: OFPlanningSectionKey
): OFPlanningEditCommand[] {
  return commands.filter((command) => 'sectionKey' in command && command.sectionKey === sectionKey)
}
