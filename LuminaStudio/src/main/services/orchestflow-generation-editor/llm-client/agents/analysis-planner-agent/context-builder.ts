import {
  buildOFRequirementContextPack,
  renderOFAgentContextPack,
  type OFRequirementDocument
} from '@shared/Orchestraflow-types'
import type {
  GenerationChannelKey,
  GenerationMessage,
  GenerationMessageMetaPayload,
  GenerationPlanningBlockPayload
} from '@preload/types'
import type { GenerationEditorRepository } from '../../repositories/generation-editor.repository'
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
  const capabilityContextText = renderOFAgentContextPack(
    buildOFRequirementContextPack({
      document: latestPlanningBlock?.requirementDocument || createEmptyRequirementDocument()
    }),
    ['manifest', 'mechanisms', 'nodes', 'requirement-document']
  )

  return {
    historyEntries,
    conversationText: renderConversationText(historyEntries),
    capabilityContextText,
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
            `规划摘要: ${entry.planningBlock.summary}`,
            formatList('待补充问题', entry.planningBlock.missingQuestions),
            formatList('目标', entry.planningBlock.requirementDocument.goals),
            formatList('成功标准', entry.planningBlock.requirementDocument.success_criteria),
            formatList('约束', entry.planningBlock.requirementDocument.constraints)
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

function formatList(title: string, items: string[]): string {
  if (!items.length) return ''
  return `${title}: ${items.join('；')}`
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
    if (meta?.planningBlock?.kind === 'analysis-planning') {
      return meta.planningBlock
    }
  } catch {
    return null
  }

  return null
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
