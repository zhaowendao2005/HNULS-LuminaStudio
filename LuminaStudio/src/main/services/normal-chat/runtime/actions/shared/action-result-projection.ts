/**
 * 动作结果投影
 *
 * 定义动作执行结果的记录结构和 Markdown 投影函数。
 *
 * NormalChatActionResultRecord 是动作执行结果的标准化记录，
 * 用于持久化存储、前端展示和后续 prompt 注入。
 *
 * projectActionResultMarkdown 将结果记录转换为 Markdown 格式，
 * 用于注入到后续轮次的 prompt 中，让 LLM 了解上一轮动作的执行结果。
 */
import type { NormalChatActionExecutorOutput } from './action.types'

/**
 * 动作结果记录
 *
 * 标准化的动作执行结果，包含输入、输出、状态和错误信息。
 */
export interface NormalChatActionResultRecord {
  /** 动作标识键 */
  actionKey: string
  /** 动作显示标题 */
  title: string
  /** 执行状态 */
  status: 'success' | 'schema_error' | 'validation_error' | 'permission_denied' | 'execution_error' | 'unknown_action'
  /** 是否可重试 */
  retryable: boolean
  /** 输入参数的 JSON 字符串 */
  inputJson: string
  /** 输出结果的 JSON 字符串（失败时为 null） */
  outputJson: string | null
  /** 错误消息（成功时为 null） */
  errorMessage: string | null
  /** 面向模型的 Markdown 摘要（用于 prompt 注入） */
  modelFacingSummaryMd: string
  /** 原始执行输出（用于后续处理，如子 Agent 摘要提取） */
  output: NormalChatActionExecutorOutput | null
}

/**
 * 将动作结果记录投影为 Markdown 格式
 *
 * 生成的 Markdown 包含动作标题、状态、可重试标记、
 * 错误信息（如有）和执行结果摘要。
 *
 * @param record - 动作结果记录
 * @returns Markdown 格式的结果字符串
 */
export function projectActionResultMarkdown(record: NormalChatActionResultRecord): string {
  // 基础信息：标题、状态、可重试标记
  const lines = [`### ${record.title}`, `status: ${record.status}`, `retryable: ${record.retryable}`]

  // 错误信息（仅在有错误时添加）
  if (record.errorMessage) {
    lines.push(`error: ${record.errorMessage}`)
  }

  // 执行结果：优先使用模型面向摘要，否则使用原始输出 JSON
  if (record.modelFacingSummaryMd) {
    lines.push('', record.modelFacingSummaryMd)
  } else if (record.outputJson) {
    lines.push('', record.outputJson)
  }

  return lines.join('\n')
}
