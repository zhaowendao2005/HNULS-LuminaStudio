import type { ExternalApiResponse } from '@shared/knowledge-database-api.types'
import type { KnowledgeRetrievalErrorDto } from './types'

/**
 * 构造标准化错误 DTO。
 */
export function createKnowledgeRetrievalError(
  code: KnowledgeRetrievalErrorDto['code'],
  message: string,
  details?: Record<string, unknown>
): KnowledgeRetrievalErrorDto {
  return {
    code,
    message,
    retriable: code === 'NETWORK_ERROR' || code === 'UPSTREAM_HTTP_ERROR',
    details
  }
}

/**
 * 把未知错误归一化成统一 DTO。
 */
export function normalizeKnowledgeRetrievalError(
  error: unknown,
  fallbackCode: KnowledgeRetrievalErrorDto['code'] = 'UNKNOWN_ERROR',
  details?: Record<string, unknown>
): KnowledgeRetrievalErrorDto {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createKnowledgeRetrievalError('ABORTED', '知识检索已被中止', details)
    }

    return createKnowledgeRetrievalError(fallbackCode, error.message, details)
  }

  return createKnowledgeRetrievalError(fallbackCode, String(error), details)
}

/**
 * 把上游 REST 返回的 success/error 结构转换为统一错误。
 */
export function normalizeUpstreamResponseError(
  response: ExternalApiResponse<unknown> | null,
  fallbackMessage: string,
  details?: Record<string, unknown>
): KnowledgeRetrievalErrorDto {
  if (!response) {
    return createKnowledgeRetrievalError('UPSTREAM_RESPONSE_INVALID', fallbackMessage, details)
  }

  if (response.success) {
    return createKnowledgeRetrievalError('UPSTREAM_RESPONSE_INVALID', fallbackMessage, details)
  }

  return createKnowledgeRetrievalError(
    response.error.code === 'NETWORK_ERROR' ? 'NETWORK_ERROR' : 'UPSTREAM_HTTP_ERROR',
    response.error.message || fallbackMessage,
    {
      ...details,
      upstreamCode: response.error.code,
      upstreamDetails: response.error.details
    }
  )
}
