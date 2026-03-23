/**
 * 规范化 OpenAI 兼容 API 的基础 URL。
 *
 * 说明：
 * - 去掉前后空白
 * - 去掉末尾单个斜杠
 * - 确保最终以 /v1 结尾
 */
export function normalizeOpenAICompatibleBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}
