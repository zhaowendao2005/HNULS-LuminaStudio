import { buildOFPlanningMarkdown, parseOFPlanningMarkdown } from '@shared/Orchestraflow-types'
import type { GenerationMessage } from '@preload/types'
import type { GenerationEditorRepository } from '../../../repositories/generation-editor.repository'
import { buildPlanningEditCapabilityPrompt } from '../../prompt-sources/planning-contract.source'
import type { CopilotEditorContextBundle } from './types'

export function buildCopilotEditorContextBundle(params: {
  repository: GenerationEditorRepository
  sessionId: string
  planningDocumentId: string
  memoryRounds: number
}): CopilotEditorContextBundle {
  const planningDocument = params.repository.getPlanningDocumentById(params.planningDocumentId)
  const discussionMessages = params.repository.listMessages({
    sessionId: params.sessionId,
    channelKey: 'analysis-discussion'
  })
  const copilotMessages = params.repository.listMessages({
    sessionId: params.sessionId,
    channelKey: 'analysis-copilot'
  })

  return {
    planningDocument,
    sourceMarkdown: planningDocument.sourceMarkdown,
    discussionHistoryText: renderConversationText(
      selectRecentConversationRounds(discussionMessages, params.memoryRounds)
    ),
    copilotHistoryText: renderConversationText(
      selectRecentConversationRounds(copilotMessages, params.memoryRounds)
    ),
    capabilityContextText: buildPlanningEditCapabilityPrompt({
      currentDocumentMarkdown: buildOFPlanningMarkdown(planningDocument),
      sourceDocumentMarkdown: planningDocument.sourceMarkdown
        ? buildOFPlanningMarkdown(parseOFPlanningMarkdown(planningDocument.sourceMarkdown).document)
        : buildOFPlanningMarkdown(planningDocument)
    })
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

function renderConversationText(messages: GenerationMessage[]): string {
  if (!messages.length) {
    return '暂无历史对话。'
  }

  return messages
    .map((message, index) => {
      const roleLabel = message.role === 'user' ? 'USER' : 'ASSISTANT'
      return [`#${index + 1} [${roleLabel}]`, message.content.trim() || '(空消息)'].join('\n')
    })
    .join('\n\n')
}
