/**
 * 助手结构化输出
 *
 * NormalChatAssistantOutputParser 解析 LLM 原始输出后得到的结构化结果。
 *
 * 包含三个核心字段：
 * - body_md：助手回复的 Markdown 正文（剥离 action 和 thinking 块后的纯文本）
 * - action_calls：从响应中提取的动作调用列表（工具调用请求）
 * - thinking_md：助手的思维链内容（CoT 推理过程，无则为 null）
 */
import type { NormalChatActionCall } from '../../actions/shared/action.types'

/**
 * 助手结构化输出接口
 *
 * 由 NormalChatAssistantOutputParser.parse() 方法返回。
 */
export interface NormalChatAssistantStructuredOutput {
  /** 助手回复的 Markdown 正文（已剥离 action/thinking 块） */
  body_md: string
  /** 从响应中提取的动作调用列表 */
  action_calls: NormalChatActionCall[]
  /** 思维链内容（<thinking> 标签内的 Markdown），无则为 null */
  thinking_md: string | null
}
