/**
 * 助手输出解析器
 *
 * 负责将 LLM 助手的原始文本响应解析为结构化输出，包括：
 * - body_md：助手回复的 Markdown 正文内容
 * - action_calls：从响应中提取的动作调用列表（工具调用）
 * - thinking_md：助手的思考过程（CoT 思维链）内容
 *
 * 解析流程：
 * 1. 校验输入是否为字符串
 * 2. 提取 action 块（工具调用 JSON）和 thinking 块（思维链）
 * 3. 若无任何特殊块，直接将原文作为正文返回
 * 4. 否则，解析 action 块为结构化的动作调用，并剥离 action 块得到正文
 */
import type { NormalChatActionCall } from '../../actions/shared/action.types'
import type { NormalChatAssistantStructuredOutput } from './assistant-output.types'
import { extractActionBlocks, extractThinkingBlocks, stripActionBlocks } from './action-block-extractor'

/**
 * 助手输出解析器类
 *
 * 将 LLM 返回的原始字符串解析为 {@link NormalChatAssistantStructuredOutput} 结构化对象。
 */
export class NormalChatAssistantOutputParser {
  /**
   * 解析助手的原始输出文本
   *
   * @param input - LLM 返回的原始内容（期望为字符串）
   * @returns 结构化的助手输出对象，包含正文、动作调用和思考过程
   * @throws 当 input 不是字符串时抛出错误
   * @throws 当存在 action/thinking 块但正文为空时抛出错误
   * @throws 当 action 块 JSON 格式不合法或缺少必填字段时抛出错误
   */
  parse(input: unknown): NormalChatAssistantStructuredOutput {
    // ── 1. 类型校验：确保输入为字符串 ──
    if (typeof input !== 'string') {
      throw new Error('Assistant output raw response must be a string.')
    }

    // ── 2. 提取 action 块和 thinking 块 ──
    // action 块：包含工具调用的 JSON 代码块
    // thinking 块：包含模型思维链的 <thinking> 标签内容
    const actionBlocks = extractActionBlocks(input)
    const thinkingBlocks = extractThinkingBlocks(input)

    // ── 3. 快速路径：无特殊块时直接返回原文 ──
    // 如果既没有 action 块也没有 thinking 块，说明是纯文本回复
    // 此时直接将原文（去除首尾空白）作为正文返回
    if (actionBlocks.length === 0 && thinkingBlocks.length === 0) {
      const bodyMd = input.trim() || '[模型返回内容为空]'
      return {
        body_md: bodyMd,
        action_calls: [],
        thinking_md: null
      }
    }

    // ── 4. 解析 action 块为结构化的动作调用 ──
    // 将每个 action 块的原始 JSON 字符串解析为 NormalChatActionCall 对象
    const actionCalls = actionBlocks.map((block, index) => this.parseActionBlock(block.rawJson, index))

    // ── 5. 剥离 action 块得到正文 Markdown ──
    // 从原始输入中移除所有 action 代码块，剩余部分即为正文
    const bodyMd = stripActionBlocks(input)

    // ── 6. 合并 thinking 块为单个 Markdown 字符串 ──
    // 多个 thinking 块之间用双换行连接，若无内容则设为 null
    const thinkingMd = thinkingBlocks.map((block) => block.rawMarkdown).join('\n\n').trim() || null

    // ── 7. 正文非空校验 ──
    // 当存在 action 或 thinking 块时，正文不应为空（否则可能是解析异常）
    if (!bodyMd.trim()) {
      throw new Error('Assistant output body markdown must not be empty when action or thinking blocks exist.')
    }

    // ── 8. 返回结构化输出 ──
    return {
      body_md: bodyMd,
      action_calls: actionCalls,
      thinking_md: thinkingMd
    }
  }

  /**
   * 解析单个 action 块的原始 JSON 字符串
   *
   * 将 action 块中的 JSON 字符串解析为 {@link NormalChatActionCall} 对象，
   * 并校验必填字段（actionKey、input）的合法性。
   *
   * @param rawJson - action 块中的原始 JSON 字符串
   * @param index - 该 action 块在列表中的索引（从 0 开始，用于错误提示）
   * @returns 解析后的动作调用对象
   * @throws 当 JSON 格式不合法时抛出错误
   * @throws 当 actionKey 缺失或为空时抛出错误
   * @throws 当 input 不是对象类型时抛出错误
   */
  private parseActionBlock(rawJson: string, index: number): NormalChatActionCall {
    // ── 1. JSON 解析 ──
    let record: Record<string, unknown>
    try {
      record = JSON.parse(rawJson) as Record<string, unknown>
    } catch (error) {
      throw new Error(
        `Malformed normal_chat_action block #${index + 1}: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    // ── 2. actionKey 字段校验 ──
    // actionKey 必须是非空字符串，用于标识要执行的动作类型
    if (typeof record.actionKey !== 'string' || !record.actionKey.trim()) {
      throw new Error(`normal_chat_action block #${index + 1} missing non-empty actionKey.`)
    }

    // ── 3. input 字段校验 ──
    // input 必须是一个普通对象（不能是数组或 null/undefined）
    if (!record.input || typeof record.input !== 'object' || Array.isArray(record.input)) {
      throw new Error(`normal_chat_action block #${index + 1} must include an object input.`)
    }

    // ── 4. 返回解析后的动作调用对象 ──
    return {
      actionKey: record.actionKey,
      input: record.input as Record<string, unknown>
    }
  }
}
