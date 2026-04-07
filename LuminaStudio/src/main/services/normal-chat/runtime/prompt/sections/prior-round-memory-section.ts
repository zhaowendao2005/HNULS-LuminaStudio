import type { NormalChatAssistantRoundArtifact } from '../../agent/memory/assistant-round-memory.types'

export function buildPriorRoundMemorySection(input: {
  artifacts: NormalChatAssistantRoundArtifact[]
  roundMemoryWindow: number
}): string {
  const recentArtifacts = input.artifacts.slice(-Math.max(0, input.roundMemoryWindow))
  const olderArtifacts = input.artifacts.slice(
    0,
    Math.max(0, input.artifacts.length - recentArtifacts.length)
  )

  const recentBody = recentArtifacts.length
    ? recentArtifacts
        .map((artifact) => {
          const plannedActions = artifact.plannedActions.length
            ? artifact.plannedActions
                .map((item) => `- ${item.actionKey}(${item.inputPreview})`)
                .join('\n')
            : '(none)'
          // action_plan 轮在 memory 中只作为“计划上下文”存在，明确不用 Assistant summary 标签，避免误导模型把旧计划当最终结论。
          const leadingBody = artifact.turnKind === 'action_plan'
            ? artifact.planBodyMd || '(empty)'
            : artifact.answerBodyMd || artifact.bodyMd || '(empty)'
          const leadingLabel = artifact.turnKind === 'action_plan' ? 'Action plan note:' : 'Assistant summary:'
          const resultSummary = artifact.resultSummaryMd || '(no action results yet)'
          const childSummaries = artifact.childSummariesMd
            ? `\n\nChild summaries:\n${artifact.childSummariesMd}`
            : ''

          return [
            `### Round ${artifact.roundIndex}`,
            `turn_kind: ${artifact.turnKind}`,
            leadingLabel,
            leadingBody,
            '',
            'Planned actions:',
            plannedActions,
            '',
            'Outcome summary:',
            resultSummary,
            childSummaries
          ].join('\n')
        })
        .join('\n\n')
    : '(no prior round memory)'

  const olderDigest = olderArtifacts.length
    ? [
        '### Older Round Digest',
        olderArtifacts
          .map(
            (artifact) =>
              `- Round ${artifact.roundIndex}: ${(artifact.compactSummaryMd || artifact.resultSummaryMd || artifact.answerBodyMd || artifact.planBodyMd || artifact.bodyMd || '').replace(/\s+/g, ' ').slice(0, 180)}`
          )
          .join('\n')
      ].join('\n')
    : ''

  return ['## PriorRoundMemory', recentBody, olderDigest].filter(Boolean).join('\n\n')
}
