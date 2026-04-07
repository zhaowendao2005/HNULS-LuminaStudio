/**
 * 助手轮次记忆服务
 *
 * 管理 Agent 每一轮对话的"记忆"——即轮次工件（Round Artifact）。
 * 每个工件记录了一轮对话中：
 * - 助手的回复正文（bodyMd）
 * - 计划执行的动作列表（plannedActions）
 * - 动作执行结果摘要（resultSummaryMd）
 * - 子 Agent 摘要（childSummariesMd）
 *
 * 工件用于：
 * 1. 注入到后续轮次的 prompt 中，让 LLM 了解之前的对话内容
 * 2. 生成旧轮次的紧凑摘要（digest），节省 prompt 空间
 * 3. 为 LLM 提供错误反馈和修复提示（fixHint）
 */
import type { NormalChatDispatchSubAgentOutput } from '../../actions/shared/action.types'
import { projectActionResultMarkdown } from '../../actions/shared/action-result-projection'
import type {
  NormalChatActionExecutionBatchResult,
  NormalChatActionFeedback,
  NormalChatAssistantOutputArtifactInput,
  NormalChatAssistantRoundArtifact
} from './assistant-round-memory.types'

/**
 * 截断文本到指定最大长度
 *
 * @param value - 原始文本
 * @param maxLength - 最大字符数
 * @returns 截断后的文本，超出部分用省略号表示
 */
function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`
}

/**
 * 构建输入参数的预览文本
 *
 * 将输入对象序列化为 JSON 并截断到 160 字符，用于在 prompt 中展示动作调用的输入预览。
 *
 * @param input - 动作输入参数
 * @returns 截断后的 JSON 预览字符串
 */
function buildInputPreview(input: Record<string, unknown>): string {
  return truncateText(JSON.stringify(input), 160)
}

/**
 * 根据错误状态生成修复提示
 *
 * 为不同类型的错误提供针对性的修复建议，帮助 LLM 在下一轮修正输入。
 *
 * @param feedback - 动作反馈
 * @returns 修复提示文本，无提示时返回 null
 */
function buildFeedbackFixHint(feedback: NormalChatActionFeedback): string | null {
  switch (feedback.status) {
    case 'schema_error':
      return '请严格按照当前已暴露 schema 修正字段名、类型和必填项。'
    case 'validation_error':
      return '请调整参数取值，避免再次提交同样的业务非法输入。'
    case 'permission_denied':
      return '请更换动作或调整目标，不要原样重试同一个被拒绝动作。'
    case 'execution_error':
      return '请根据错误信息缩小动作范围，或选择更稳妥的动作。'
    default:
      return null
  }
}

/**
 * 助手轮次记忆服务类
 *
 * 管理轮次工件的创建、合并和摘要生成。
 */
export class NormalChatAssistantRoundMemoryService {
  /**
   * 从助手输出创建轮次工件
   *
   * 在每轮 LLM 输出解析后调用，创建初始工件（仅包含正文和计划动作）。
   * 动作执行结果会在后续 mergeExecutionResultsIntoArtifact 中合并。
   *
   * @param input - 助手输出工件输入（轮次索引、正文、动作调用列表）
   * @returns 初始轮次工件
   */
  createArtifactFromAssistant(
    input: NormalChatAssistantOutputArtifactInput
  ): NormalChatAssistantRoundArtifact {
    return {
      roundIndex: input.roundIndex,
      bodyMd: truncateText(input.bodyMd.trim(), 400),
      plannedActions: input.actionCalls.map((call) => ({
        actionKey: call.actionKey,
        inputPreview: buildInputPreview(call.input)
      })),
      resultSummaryMd: '',
      compactSummaryMd: '',
      childSummariesMd: null
    }
  }

  /**
   * 将动作执行结果合并到轮次工件中
 *
   * 在动作执行完成后调用，将批次执行结果（成功结果、反馈、子 Agent 摘要）
   * 合并到工件的 resultSummaryMd 和 childSummariesMd 字段中。
   *
   * @param artifact - 原始轮次工件
   * @param batch - 动作执行批次结果
   * @returns 更新后的轮次工件
   */
  mergeExecutionResultsIntoArtifact(
    artifact: NormalChatAssistantRoundArtifact,
    batch: NormalChatActionExecutionBatchResult
  ): NormalChatAssistantRoundArtifact {
    // 将所有成功结果转换为 Markdown
    const successMarkdown = batch.results.map(projectActionResultMarkdown).join('\n\n')

    // 将所有反馈转换为 Markdown（包含修复提示）
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

    // 将子 Agent 摘要转换为 Markdown
    const childSummariesMd = batch.childSummaries.length
      ? batch.childSummaries
          .map((item) => `### Child Agent ${item.childAgentRunId}\n\n${item.summaryMarkdown}`)
          .join('\n\n')
      : null

    return {
      ...artifact,
      resultSummaryMd: [successMarkdown, feedbackMarkdown].filter(Boolean).join('\n\n'),
      childSummariesMd
    }
  }

  /**
   * 构建旧轮次的紧凑摘要
 *
   * 将多个轮次工件压缩为单行摘要列表，用于注入到 prompt 中
   * 以节省 token 空间。每个摘要截断到 180 字符。
   *
   * @param artifacts - 轮次工件列表
   * @returns 紧凑摘要文本（每行一个轮次）
   */
  buildOlderRoundDigest(artifacts: NormalChatAssistantRoundArtifact[]): string {
    if (artifacts.length === 0) {
      return ''
    }

    return artifacts
      .map((artifact) => {
        const summary = artifact.compactSummaryMd || artifact.resultSummaryMd || artifact.bodyMd
        return `- Round ${artifact.roundIndex}: ${truncateText(summary.replace(/\s+/g, ' '), 180)}`
      })
      .join('\n')
  }

  /**
   * 从错误信息创建动作反馈
   *
   * @param input - 错误信息（动作键、标题、状态、消息等）
   * @returns 动作反馈对象（包含修复提示）
   */
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

  /**
   * 尝试从动作输出中提取子 Agent 摘要
   *
   * 用于从 dispatch_sub_agent 动作的输出中提取子 Agent 的运行 ID 和摘要。
   *
   * @param output - 动作执行输出
   * @returns 子 Agent 输出，非子 Agent 输出时返回 null
   */
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
}
