export const COPILOT_EDITOR_DSL_START_MARKER = '<LUMINA_PLANNING_COMMANDS>'
export const COPILOT_EDITOR_DSL_END_MARKER = '</LUMINA_PLANNING_COMMANDS>'

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
