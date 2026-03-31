const ACTION_BLOCK_PATTERN = /```normal_chat_action\s*\r?\n([\s\S]*?)```/g

export interface ExtractedActionBlock {
  rawJson: string
  start: number
  end: number
}

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

export function stripActionBlocks(markdown: string): string {
  return markdown
    .replace(ACTION_BLOCK_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
