export function normalizeNormalChatText(text: string): string {
  return text.replaceAll('\r\n', '\n').trim()
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
