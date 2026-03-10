export interface ParsedGenerationDslCommand {
  kind: 'WIRE_BATCH' | 'CONFIG_BATCH' | 'EDIT_BATCH'
  lines: string[]
}

export function parseGenerationDsl(input: string): ParsedGenerationDslCommand[] {
  const blocks = input
    .split(/\r?\n\s*\r?\n/g)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks.map((block) => {
    const [header, ...rest] = block.split(/\r?\n/g)
    const normalized = header.trim().toUpperCase()
    const kind = normalized.includes('WIRE')
      ? 'WIRE_BATCH'
      : normalized.includes('CONFIG')
        ? 'CONFIG_BATCH'
        : 'EDIT_BATCH'

    return {
      kind,
      lines: rest.map((line) => line.trim()).filter(Boolean)
    }
  })
}
