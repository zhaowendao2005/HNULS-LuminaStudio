import type { NormalChatDispatchSubAgentOutput } from '../../actions/shared/action.types'
import { projectActionResultMarkdown } from '../../actions/shared/action-result-projection'
import type {
  NormalChatActionExecutionBatchResult,
  NormalChatActionFeedback,
  NormalChatAssistantOutputArtifactInput,
  NormalChatAssistantRoundArtifact
} from './assistant-round-memory.types'

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`
}

function buildInputPreview(input: Record<string, unknown>): string {
  return truncateText(JSON.stringify(input), 160)
}

function buildFeedbackFixHint(feedback: NormalChatActionFeedback): string | null {
  switch (feedback.status) {
    case 'schema_error':
      return '请严格按照当前已暴露 schema 修正字段名、类型和必填项。'
    case 'validation_error':
      return '请调整参数取值，避免再次提交同样的业务非法输入。'
    case 'permission_denied':
      return '请更换动作或调整目标，不要原样重试同一个被拒绝动作。'
    case 'execution_error':
      return '请基于已拿到的结果或错误继续总结，不要停留在计划描述。'
    default:
      return null
  }
}

export class NormalChatAssistantRoundMemoryService {
  createArtifactFromAssistant(
    input: NormalChatAssistantOutputArtifactInput
  ): NormalChatAssistantRoundArtifact {
    const trimmedBody = truncateText(input.bodyMd.trim(), 400)
    return {
      roundIndex: input.roundIndex,
      turnKind: input.turnKind,
      bodyMd: trimmedBody,
      planBodyMd: input.turnKind === 'action_plan' ? trimmedBody : null,
      answerBodyMd: input.turnKind === 'action_plan' ? null : trimmedBody,
      plannedActions: input.actionCalls.map((call) => ({
        actionKey: call.actionKey,
        inputPreview: buildInputPreview(call.input)
      })),
      resultSummaryMd: '',
      compactSummaryMd: '',
      childSummariesMd: null,
      executedActionRunIds: []
    }
  }

  mergeExecutionResultsIntoArtifact(
    artifact: NormalChatAssistantRoundArtifact,
    batch: NormalChatActionExecutionBatchResult
  ): NormalChatAssistantRoundArtifact {
    const successMarkdown = batch.results.map(projectActionResultMarkdown).join('\n\n')
    const feedbackMarkdown = batch.feedback
      .map((feedback) => {
        const fixHint = buildFeedbackFixHint(feedback)
        return [
          `### ${feedback.title}`,
          `status: ${feedback.status}`,
          `retryable: ${feedback.retryable}`,
          `message: ${feedback.message}`,
          ...(fixHint ? [`fix_hint: ${fixHint}`] : [])
        ].join('\n')
      })
      .join('\n\n')
    const childSummariesMd = batch.childSummaries.length
      ? batch.childSummaries
          .map((item) => `### Child Agent ${item.childAgentRunId}\n\n${item.summaryMarkdown}`)
          .join('\n\n')
      : null

    return {
      ...artifact,
      resultSummaryMd: [artifact.resultSummaryMd, successMarkdown, feedbackMarkdown]
        .filter(Boolean)
        .join('\n\n'),
      childSummariesMd,
      executedActionRunIds: Array.from(
        new Set([...artifact.executedActionRunIds, ...batch.executedActionRunIds])
      ),
      compactSummaryMd: this.buildCompactSummary({
        ...artifact,
        resultSummaryMd: [artifact.resultSummaryMd, successMarkdown, feedbackMarkdown]
          .filter(Boolean)
          .join('\n\n'),
        childSummariesMd
      })
    }
  }

  buildOlderRoundDigest(artifacts: NormalChatAssistantRoundArtifact[]): string {
    if (artifacts.length === 0) {
      return ''
    }

    return artifacts
      .map((artifact) => {
        const summary =
          artifact.compactSummaryMd || artifact.resultSummaryMd || artifact.answerBodyMd || artifact.bodyMd
        return `- Round ${artifact.roundIndex}: ${truncateText(summary.replace(/\s+/g, ' '), 180)}`
      })
      .join('\n')
  }

  createFeedbackFromError(input: {
    actionKey: string
    title: string
    status: NormalChatActionFeedback['status']
    retryable: boolean
    message: string
    roundIndex: number
  }): NormalChatActionFeedback {
    return {
      ...input,
      fixHint: buildFeedbackFixHint({
        ...input,
        fixHint: null
      } as NormalChatActionFeedback)
    }
  }

  tryExtractChildSummary(output: unknown): NormalChatDispatchSubAgentOutput | null {
    if (!output || typeof output !== 'object') {
      return null
    }

    const record = output as Record<string, unknown>
    if (
      typeof record.childAgentRunId === 'string' &&
      typeof record.summaryMarkdown === 'string' &&
      typeof record.finalAnswer === 'string'
    ) {
      return {
        childAgentRunId: record.childAgentRunId,
        summaryMarkdown: record.summaryMarkdown,
        finalAnswer: record.finalAnswer
      }
    }

    return null
  }

  buildDeterministicFinalSummary(input: {
    actionResults: { title: string; status: string; modelFacingSummaryMd: string; errorMessage: string | null }[]
    actionFeedback: NormalChatActionFeedback[]
    assistantArtifacts: NormalChatAssistantRoundArtifact[]
  }): string {
    const latestArtifact = input.assistantArtifacts.at(-1)
    const successfulResults = input.actionResults.filter((item) => item.status === 'success')
    const failedFeedback = input.actionFeedback.filter((item) => item.status === 'execution_error')
    const lines = ['本轮未生成合格的最终总结，以下是基于已执行结果的结构化汇总。']

    if (successfulResults.length > 0) {
      lines.push('', '已完成事项：')
      lines.push(
        ...successfulResults.map((item) => `- ${item.title}: ${truncateText(item.modelFacingSummaryMd, 220)}`)
      )
    }

    if (failedFeedback.length > 0) {
      lines.push('', '失败事项：')
      lines.push(...failedFeedback.map((item) => `- ${item.title}: ${item.message}`))
    }

    if (latestArtifact?.childSummariesMd) {
      lines.push('', '子代理摘要：', latestArtifact.childSummariesMd)
    }

    if (latestArtifact?.answerBodyMd) {
      lines.push('', '当前可见回答：', latestArtifact.answerBodyMd)
    }

    return lines.join('\n')
  }

  private buildCompactSummary(artifact: NormalChatAssistantRoundArtifact): string {
    const source = artifact.resultSummaryMd || artifact.answerBodyMd || artifact.planBodyMd || artifact.bodyMd
    return truncateText(source.replace(/\s+/g, ' '), 180)
  }
}
