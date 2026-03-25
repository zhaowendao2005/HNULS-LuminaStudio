export function extractJsonText(rawText: string): string | null {
  const fencedMatch = rawText.match(/```(?:json|jsonc)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]?.trim()) {
    return fencedMatch[1].trim()
  }

  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1).trim()
  }

  return rawText.trim() || null
}
