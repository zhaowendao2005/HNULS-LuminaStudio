export const COPILOT_EDITOR_DSL_START_MARKER = '<LUMINA_PLANNING_COMMANDS>'
export const COPILOT_EDITOR_DSL_END_MARKER = '</LUMINA_PLANNING_COMMANDS>'

const CONTROL_LINE_PATTERN =
  /^(DOC |MODE |REPLACE_SECTION\b|APPEND_SECTION\b|CLEAR_SECTION\b|RESET_DOCUMENT$|NOOP$|section-key:|new-content:)/i

export function extractVisibleTextAndDsl(rawText: string): {
  visibleText: string
  commandDsl: string
} {
  const startIndex = rawText.indexOf(COPILOT_EDITOR_DSL_START_MARKER)
  const endIndex = rawText.indexOf(COPILOT_EDITOR_DSL_END_MARKER)

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    return {
      visibleText: rawText.trim(),
      commandDsl: ''
    }
  }

  return {
    visibleText: rawText.slice(0, startIndex).trim(),
    commandDsl: rawText.slice(startIndex, endIndex + COPILOT_EDITOR_DSL_END_MARKER.length).trim()
  }
}

export function normalizeCopilotEditorCommandDsl(commandDsl: string): string {
  if (!commandDsl.trim()) {
    return ''
  }

  const normalizedLines: string[] = []
  const lines = commandDsl.replace(/\r\n?/g, '\n').split('\n')
  let pendingCommand: 'REPLACE_SECTION' | 'APPEND_SECTION' | null = null
  let inYamlCompatContentBlock = false

  const closeYamlCompatContentBlock = (): void => {
    if (!inYamlCompatContentBlock) {
      return
    }
    normalizedLines.push('</CONTENT>')
    inYamlCompatContentBlock = false
  }

  const normalizeYamlContentLine = (line: string): string => {
    // 这里只做非常保守的缩进归一化，避免把正文内容猜错。
    return line.replace(/^( {2}|\t)/, '')
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      normalizedLines.push(inYamlCompatContentBlock ? '' : line)
      return
    }

    if (trimmed.startsWith('```')) {
      return
    }

    if (inYamlCompatContentBlock && CONTROL_LINE_PATTERN.test(trimmed)) {
      closeYamlCompatContentBlock()
    }

    if (/^REPLACE_SECTION$/i.test(trimmed)) {
      pendingCommand = 'REPLACE_SECTION'
      return
    }

    if (/^APPEND_SECTION$/i.test(trimmed)) {
      pendingCommand = 'APPEND_SECTION'
      return
    }

    const inlineCommandMatch = trimmed.match(/^(REPLACE_SECTION|APPEND_SECTION)\s+([a-z0-9-]+)$/i)
    if (inlineCommandMatch) {
      pendingCommand = null
      normalizedLines.push(`${inlineCommandMatch[1].toUpperCase()} ${inlineCommandMatch[2].trim()}`)
      return
    }

    const sectionKeyMatch = trimmed.match(/^section-key:\s*([a-z0-9-]+)\s*$/i)
    if (sectionKeyMatch && pendingCommand) {
      normalizedLines.push(`${pendingCommand} ${sectionKeyMatch[1].trim()}`)
      pendingCommand = null
      return
    }

    const contentStartMatch = trimmed.match(/^new-content:\s*\|?\s*$/i)
    if (contentStartMatch) {
      closeYamlCompatContentBlock()
      normalizedLines.push('<CONTENT>')
      inYamlCompatContentBlock = true
      return
    }

    if (trimmed === '<CONTENT>' || trimmed === '</CONTENT>') {
      if (trimmed === '<CONTENT>' && inYamlCompatContentBlock) {
        closeYamlCompatContentBlock()
      }
      normalizedLines.push(trimmed)
      return
    }

    if (inYamlCompatContentBlock) {
      normalizedLines.push(normalizeYamlContentLine(line))
      return
    }

    normalizedLines.push(trimmed)
  })

  closeYamlCompatContentBlock()
  return normalizedLines.join('\n').trim()
}
