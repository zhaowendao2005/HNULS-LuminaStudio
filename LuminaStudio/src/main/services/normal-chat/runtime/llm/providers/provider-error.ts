/**
 * 将 SDK 抛出的错误统一转换为简洁可读的错误字符串。
 * 格式："<status> <reason>" 例如 "503 Service Unavailable: The model is overloaded"
 *
 * OpenAI SDK 的 APIError 携带 .status（number）和 .message（string）。
 * LangChain/Anthropic 的错误通常为 Error，message 中已包含状态信息。
 */
export function extractProviderError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    // OpenAI APIError 形状：{ status: number, message: string, error?: { message } }
    if (typeof e.status === 'number' && typeof e.message === 'string') {
      return `${e.status} ${e.message}`
    }
    // LangChain 有时将 statusCode 放在 response 里
    if (typeof e.statusCode === 'number' && typeof e.message === 'string') {
      return `${e.statusCode} ${e.message}`
    }
  }
  if (err instanceof Error) return err.message
  return String(err)
}
