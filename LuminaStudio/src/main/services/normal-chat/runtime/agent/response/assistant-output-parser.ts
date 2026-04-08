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
 * 3. 解析 action 块并做同轮去重
 * 4. 剥离 action 块后，对正文做协议残片清洗与段落级去重
 */
import type { NormalChatActionCall } from '../../actions/shared/action.types'
import type { NormalChatAssistantStructuredOutput } from './assistant-output.types'
import {
  extractActionBlocks,
  extractThinkingBlocks,
  stripActionBlocks
} from './action-block-extractor'

const ACTION_INLINE_MARKER_PATTERN = /`?normal_chat_action`?/gi
const ACTION_JSON_FRAGMENT_PATTERN =
  /\{\s*"actionKey"\s*:\s*"[^"]+"\s*,\s*"input"\s*:\s*\{[\s\S]*?\}\s*\}/g
const OPEN_ACTION_FENCE_PATTERN = /```\s*normal_chat_action\s*/gi
const OPEN_THINKING_FENCE_PATTERN = /```\s*normal_chat_thinking\s*/gi

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    )
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function dedupeParagraphs(markdown: string): string {
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  const deduped: string[] = []
  let previousFingerprint = ''
  for (const paragraph of paragraphs) {
    const fingerprint = normalizeWhitespace(paragraph)
    if (!fingerprint || fingerprint === previousFingerprint) {
      continue
    }
    deduped.push(paragraph)
    previousFingerprint = fingerprint
  }

  return deduped.join('\n\n').trim()
}

function sanitizeBodyMarkdown(markdown: string): string {
  return dedupeParagraphs(
    markdown
      .replace(ACTION_INLINE_MARKER_PATTERN, '')
      .replace(OPEN_ACTION_FENCE_PATTERN, '')
      .replace(OPEN_THINKING_FENCE_PATTERN, '')
      .replace(ACTION_JSON_FRAGMENT_PATTERN, '')
      .replace(/```+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

function dedupeActionCalls(actionCalls: NormalChatActionCall[]): NormalChatActionCall[] {
  const seen = new Set<string>()
  const deduped: NormalChatActionCall[] = []

  for (const actionCall of actionCalls) {
    const fingerprint = `${actionCall.actionKey}::${stableStringify(actionCall.input)}`
    if (seen.has(fingerprint)) {
      continue
    }
    seen.add(fingerprint)
    deduped.push(actionCall)
  }

  return deduped
}

/**
 * 助手输出解析器类
 *
 * 将 LLM 返回的原始字符串解析为 {@link NormalChatAssistantStructuredOutput} 结构化对象。
 */
export class NormalChatAssistantOutputParser {
  parse(input: unknown): NormalChatAssistantStructuredOutput {
    if (typeof input !== 'string') {
      throw new Error('Assistant output raw response must be a string.')
    }

    const actionBlocks = extractActionBlocks(input)
    const thinkingBlocks = extractThinkingBlocks(input)

    if (actionBlocks.length === 0 && thinkingBlocks.length === 0) {
      const bodyMd = sanitizeBodyMarkdown(input) || '[模型返回内容为空]'
      return {
        body_md: bodyMd,
        action_calls: [],
        thinking_md: null
      }
    }

    const actionCalls = dedupeActionCalls(
      actionBlocks.map((block, index) => this.parseActionBlock(block.rawJson, index))
    )
    const bodyMd = sanitizeBodyMarkdown(stripActionBlocks(input))
    const thinkingMd =
      thinkingBlocks
        .map((block) => block.rawMarkdown)
        .join('\n\n')
        .trim() || null

    if (!bodyMd.trim()) {
      throw new Error(
        'Assistant output body markdown must not be empty when action or thinking blocks exist.'
      )
    }

    return {
      body_md: bodyMd,
      action_calls: actionCalls,
      thinking_md: thinkingMd
    }
  }

  private parseActionBlock(rawJson: string, index: number): NormalChatActionCall {
    let record: Record<string, unknown>
    try {
      record = JSON.parse(rawJson) as Record<string, unknown>
    } catch (error) {
      throw new Error(
        `Malformed normal_chat_action block #${index + 1}: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    if (typeof record.actionKey !== 'string' || !record.actionKey.trim()) {
      throw new Error(`normal_chat_action block #${index + 1} missing non-empty actionKey.`)
    }

    if (!record.input || typeof record.input !== 'object' || Array.isArray(record.input)) {
      throw new Error(`normal_chat_action block #${index + 1} must include an object input.`)
    }

    return {
      actionKey: record.actionKey,
      input: record.input as Record<string, unknown>
    }
  }
}
