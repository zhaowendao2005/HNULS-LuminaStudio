/**
 * 动作块提取器
 *
 * 从 LLM 输出的 Markdown 文本中提取特殊代码块：
 * - Action 块：```normal_chat_action ... ``` 包含的 JSON 格式工具调用
 * - Thinking 块：```normal_chat_thinking ... ``` 包含的思维链内容
 *
 * 使用正则表达式匹配代码块边界，提取块内容并记录位置信息。
 * 同时提供剥离这些特殊块后获取纯正文 Markdown 的能力。
 *
 * LLM 输出格式示例：
 * ```
 * 这是正文内容
 * ```normal_chat_action
 * {"actionKey": "functioncall.pubmed_search", "input": {"query": "cancer"}}
 * ```
 * ```
 */
const ACTION_BLOCK_PATTERN = /```normal_chat_action\s*\r?\n([\s\S]*?)```/g
const THINKING_BLOCK_PATTERN = /```normal_chat_thinking\s*\r?\n([\s\S]*?)```/g

/**
 * 提取的动作块
 *
 * 包含动作块的原始 JSON 字符串和在原文中的位置信息。
 */
export interface ExtractedActionBlock {
  /** 动作块内的原始 JSON 字符串 */
  rawJson: string
  /** 块在原文中的起始位置 */
  start: number
  /** 块在原文中的结束位置 */
  end: number
}

/**
 * 提取的思考块
 *
 * 包含思考块的原始 Markdown 内容和在原文中的位置信息。
 */
export interface ExtractedThinkingBlock {
  /** 思考块内的原始 Markdown 内容 */
  rawMarkdown: string
  /** 块在原文中的起始位置 */
  start: number
  /** 块在原文中的结束位置 */
  end: number
}

/**
 * 从 Markdown 文本中提取所有 Action 块
 *
 * 使用正则匹配 ```normal_chat_action 代码块，提取其中的 JSON 内容。
 *
 * @param markdown - LLM 输出的原始 Markdown 文本
 * @returns 提取的动作块列表（按出现顺序排列）
 */
export function extractActionBlocks(markdown: string): ExtractedActionBlock[] {
  const blocks: ExtractedActionBlock[] = []

  for (const match of markdown.matchAll(ACTION_BLOCK_PATTERN)) {
    const rawJson = (match[1] ?? '').trim()
    const fullMatch = match[0] ?? ''
    const index = match.index ?? -1
    if (!rawJson || index < 0) {
      continue
    }

    blocks.push({
      rawJson,
      start: index,
      end: index + fullMatch.length
    })
  }

  return blocks
}

/**
 * 从 Markdown 文本中提取所有 Thinking 块
 *
 * 使用正则匹配 ```normal_chat_thinking 代码块，提取其中的 Markdown 内容。
 *
 * @param markdown - LLM 输出的原始 Markdown 文本
 * @returns 提取的思考块列表（按出现顺序排列）
 */
export function extractThinkingBlocks(markdown: string): ExtractedThinkingBlock[] {
  const blocks: ExtractedThinkingBlock[] = []

  for (const match of markdown.matchAll(THINKING_BLOCK_PATTERN)) {
    const rawMarkdown = (match[1] ?? '').trim()
    const fullMatch = match[0] ?? ''
    const index = match.index ?? -1
    if (!rawMarkdown || index < 0) {
      continue
    }

    blocks.push({
      rawMarkdown,
      start: index,
      end: index + fullMatch.length
    })
  }

  return blocks
}

/**
 * 从 Markdown 文本中剥离 Action 块和 Thinking 块
 *
 * 移除所有 ```normal_chat_action 和 ```normal_chat_thinking 代码块，
 * 并将连续的空行压缩为单个空行，返回纯正文 Markdown。
 *
 * @param markdown - LLM 输出的原始 Markdown 文本
 * @returns 剥离特殊块后的正文 Markdown
 */
export function stripActionBlocks(markdown: string): string {
  return markdown
    .replace(ACTION_BLOCK_PATTERN, '')
    .replace(THINKING_BLOCK_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
