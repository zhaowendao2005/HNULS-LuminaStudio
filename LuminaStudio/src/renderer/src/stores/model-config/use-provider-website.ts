export function deriveOfficialWebsiteFromBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    return url.origin
  } catch {
    return ''
  }
}
