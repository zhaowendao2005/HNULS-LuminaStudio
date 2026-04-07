import type { NormalChatAssistantRoundArtifact } from '../../agent/memory/assistant-round-memory.types'

export function buildLatestActionTurnSection(input: {
  latestArtifact: NormalChatAssistantRoundArtifact | null
  synthesisRequired: boolean
}): string {
  const { latestArtifact, synthesisRequired } = input
  // 只有上一轮真的是 action_plan 时，才需要把那一轮的计划正文和执行结果成对喂回去。
  if (!latestArtifact || latestArtifact.turnKind !== 'action_plan') {
    return ''
  }

  const actionSummary = latestArtifact.resultSummaryMd || '(no action results recorded)'
  const childSummaries = latestArtifact.childSummariesMd
    ? `\n\nChild summaries:\n${latestArtifact.childSummariesMd}`
    : ''
  // synthesisRequired 为真表示 runtime 已经认定“这是一轮强制结果消费轮”，这里直接把约束写进 prompt 主体。
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
