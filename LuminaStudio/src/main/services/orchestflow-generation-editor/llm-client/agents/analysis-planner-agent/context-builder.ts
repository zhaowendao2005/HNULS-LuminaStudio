import {
  getOFNodeDeclarationSectionDefinition,
  type OFRequirementDocument
} from '@shared/Orchestraflow-types'
import type {
  GenerationChannelKey,
  GenerationMessage,
  GenerationMessageMetaPayload,
  GenerationPlanningBlockPayload
} from '@preload/types'
import type { GenerationEditorRepository } from '../../../repositories/generation-editor.repository'
import { buildMechanismSelectionSummaryPrompt } from '../../prompt-sources/mechanism-rules.source'
import { buildNodeSelectionCatalogPrompt } from '../../prompt-sources/node-selection.source'
import { buildPlanningOutputContractPrompt } from '../../prompt-sources/planning-contract.source'
import type { AnalysisPlannerContextBundle, AnalysisPlannerHistoryEntry } from './types'

const ANALYSIS_DISCUSSION_CHANNEL: GenerationChannelKey = 'analysis-discussion'

/**
 * 这里专门负责给 analysis planner agent 组上下文。
 *
 * 规则：
 * 1. 只看 analysis-discussion 通道。
 * 2. memoryRounds 按“最近 N 轮 user+assistant 对话”解释。
 * 3. 如果窗口内已经有旧规划块，要把它当成当前需求文档继续带回去。
 */
export function buildAnalysisPlannerContextBundle(params: {
  repository: GenerationEditorRepository
  sessionId: string
  memoryRounds: number
}): AnalysisPlannerContextBundle {
  const allMessages = params.repository.listMessages({
    sessionId: params.sessionId,
    channelKey: ANALYSIS_DISCUSSION_CHANNEL
  })
  const historyEntries = selectRecentConversationRounds(allMessages, params.memoryRounds).map(
    (message) => ({
      message,
      planningBlock: parsePlanningBlockFromMessage(message)
    })
  )

  const latestPlanningBlock = findLatestPlanningBlock(historyEntries)
  return {
    historyEntries,
    conversationText: renderConversationText(historyEntries),
    planningContractText: buildPlanningOutputContractPrompt(),
    nodeSelectionCatalogText: buildNodeSelectionCatalogPrompt(),
    mechanismSummaryText: buildMechanismSelectionSummaryPrompt(),
    latestPlanningBlock
  }
}

function selectRecentConversationRounds(
  messages: GenerationMessage[],
  memoryRounds: number
): GenerationMessage[] {
  const safeRounds = Math.max(1, Math.floor(memoryRounds || 0))
  const selected: GenerationMessage[] = []
  let userTurnCount = 0

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const currentMessage = messages[index]
    selected.unshift(currentMessage)

    if (currentMessage.role === 'user') {
      userTurnCount += 1
      if (userTurnCount >= safeRounds) {
        break
      }
    }
  }

  return selected
}

function renderConversationText(entries: AnalysisPlannerHistoryEntry[]): string {
  if (entries.length === 0) {
    return '暂无历史对话。'
  }

  return entries
    .map((entry, index) => {
      const roleLabel = entry.message.role === 'user' ? 'USER' : 'ASSISTANT'
      const text = entry.message.content.trim() || '(空消息)'
      const planningText = entry.planningBlock
        ? [
            `规划状态: ${entry.planningBlock.status}`,
            renderPlanningMarkdownPreview('需求分析', entry.planningBlock.analysisMarkdown),
            renderPlanningMarkdownPreview('设计交接', entry.planningBlock.designMarkdown)
          ]
            .filter(Boolean)
            .join('\n')
        : ''

      return [
        `#${index + 1} [${roleLabel}]`,
        text,
        planningText ? `[PLANNING BLOCK]\n${planningText}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

function renderPlanningMarkdownPreview(title: string, markdown: string): string {
  if (!markdown.trim()) {
    return ''
  }
  return `${title}:\n${markdown.trim()}`
}

function findLatestPlanningBlock(
  entries: AnalysisPlannerHistoryEntry[]
): GenerationPlanningBlockPayload | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const planningBlock = entries[index].planningBlock
    if (planningBlock) {
      return planningBlock
    }
  }
  return null
}

function parsePlanningBlockFromMessage(
  message: Pick<GenerationMessage, 'metaJson'>
): GenerationPlanningBlockPayload | null {
  if (!message.metaJson) {
    return null
  }

  try {
    const meta = JSON.parse(message.metaJson) as GenerationMessageMetaPayload
    if (meta?.mode === 'planning' && meta?.planningBlock?.kind === 'analysis-planning') {
      return normalizePlanningBlock(meta.planningBlock)
    }
  } catch {
    return null
  }

  return null
}

function normalizePlanningBlock(
  planningBlock: GenerationPlanningBlockPayload
): GenerationPlanningBlockPayload {
  if (planningBlock.analysisMarkdown || planningBlock.designMarkdown) {
    return planningBlock
  }

  const legacyDocument = planningBlock.requirementDocument || createEmptyRequirementDocument()
  return {
    ...planningBlock,
    analysisMarkdown: buildLegacyAnalysisMarkdown(legacyDocument),
    designMarkdown: buildLegacyDesignMarkdown(legacyDocument)
  }
}

function buildLegacyAnalysisMarkdown(document: OFRequirementDocument): string {
  return [
    '# 需求分析',
    '## 摘要',
    '- 旧消息迁移：该规划块来自 v1 requirementDocument 结构。',
    '## 目标',
    ...toMarkdownList(document.goals),
    '## 成功标准',
    ...toMarkdownList(document.success_criteria),
    '## 约束',
    ...toMarkdownList(document.constraints),
    '## 禁止项',
    ...toMarkdownList(document.prohibitions),
    '## 待补充信息',
    '- 暂无',
    '## 成熟度信号',
    '- 暂无'
  ].join('\n')
}

function buildLegacyDesignMarkdown(document: OFRequirementDocument): string {
  const declarationTitle = getOFNodeDeclarationSectionDefinition().title
  return [
    '# 设计交接',
    `## ${declarationTitle}`,
    ...toMarkdownList(document.candidate_nodes.map((item) => `${item.type}：${item.reason}`)),
    '## 输入要求',
    ...toMarkdownList(document.input_requirements),
    '## 输出要求',
    ...toMarkdownList(document.output_requirements),
    '## 待确认问题',
    ...toMarkdownList(document.human_confirmation_questions),
    '## 蓝图要求',
    ...toMarkdownList(document.blueprint_requirements)
  ].join('\n')
}

function toMarkdownList(items: string[]): string[] {
  if (!items.length) {
    return ['- 暂无']
  }
  return items.map((item) => `- ${item}`)
}

function createEmptyRequirementDocument(): OFRequirementDocument {
  return {
    goals: [],
    success_criteria: [],
    constraints: [],
    candidate_nodes: [],
    prohibitions: [],
    human_confirmation_questions: [],
    input_requirements: [],
    output_requirements: [],
    blueprint_requirements: []
  }
}
