import type { NormalChatAssistantRoundArtifact } from '../../agent/memory/assistant-round-memory.types'

export function buildLatestActionTurnSection(input: {
  latestArtifact: NormalChatAssistantRoundArtifact | null
  synthesisRequired: boolean
}): string {
  const { latestArtifact, synthesisRequired } = input
  if (!latestArtifact || latestArtifact.turnKind !== 'action_plan') {
    return ''
  }

  const actionSummary = latestArtifact.resultSummaryMd || '(no action results recorded)'
  const childSummaries = latestArtifact.childSummariesMd
    ? `\n\nChild summaries:\n${latestArtifact.childSummariesMd}`
    : ''
  const directive = synthesisRequired
    ? 'You have fresh action results. You must now consume them before issuing any new future-tense plan. If no more action is necessary, produce the best current answer now.'
    : 'Recent action results from the previous round are included below.'

  return [
    '## LatestActionTurnResults',
    directive,
    '',
    latestArtifact.planBodyMd ? `Previous action-plan text:\n${latestArtifact.planBodyMd}` : '',
    '',
    'Executed action result summary:',
    actionSummary,
    childSummaries
  ]
    .filter(Boolean)
    .join('\n')
}
