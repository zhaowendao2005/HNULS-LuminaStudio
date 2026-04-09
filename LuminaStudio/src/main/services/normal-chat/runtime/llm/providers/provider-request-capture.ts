import { randomUUID } from 'node:crypto'
import type { ModelProviderProtocol } from '@preload/types'
import { nowIso } from '../../../shared/utils'
import type { NormalChatProviderConfig } from './provider-config.types'
const REDACTED_HEADER_VALUE = '[redacted]'
const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'x-api-key',
  'api-key',
  'anthropic-api-key'
])

export interface NormalChatCapturedProviderRequest {
  id: string
  capturedAt: string
  requestId: string
  modelCallId: string
  protocol: ModelProviderProtocol
  providerId: string
  modelId: string
  streaming: boolean
  method: string
  url: string
  headers: Record<string, string>
  bodyText: string | null
  bodyJson: unknown | null
}

export function createProviderRequestCaptureFetch(input: {
  config: Pick<NormalChatProviderConfig, 'modelId' | 'protocol' | 'providerId'>
  streaming: boolean
  captureContext: {
    requestId: string
    modelCallId: string
  }
  onCapture?: (snapshot: NormalChatCapturedProviderRequest) => void
  baseFetch?: typeof fetch
}): typeof fetch | undefined {
  const baseFetch = input.baseFetch ?? globalThis.fetch?.bind(globalThis)
  if (!baseFetch) {
    return undefined
  }

  return async (requestInfo: RequestInfo | URL, requestInit?: RequestInit): Promise<Response> => {
    const snapshot = await buildCapturedRequestSnapshot(input, requestInfo, requestInit)
    if (snapshot) {
      input.onCapture?.(snapshot)
    }
    return baseFetch(requestInfo, requestInit)
  }
}

async function buildCapturedRequestSnapshot(
  input: {
    config: Pick<NormalChatProviderConfig, 'modelId' | 'protocol' | 'providerId'>
    streaming: boolean
    captureContext: {
      requestId: string
      modelCallId: string
    }
  },
  requestInfo: RequestInfo | URL,
  requestInit?: RequestInit
): Promise<NormalChatCapturedProviderRequest | null> {
  let normalizedRequest: Request
  try {
    normalizedRequest = new Request(requestInfo, requestInit)
  } catch {
    return null
  }

  let bodyText: string | null = null
  try {
    const nextBodyText = await normalizedRequest.clone().text()
    bodyText = nextBodyText.length > 0 ? nextBodyText : null
  } catch {
    bodyText = null
  }

  return {
    id: randomUUID(),
    capturedAt: nowIso(),
    requestId: input.captureContext.requestId,
    modelCallId: input.captureContext.modelCallId,
    protocol: input.config.protocol,
    providerId: input.config.providerId,
    modelId: input.config.modelId,
    streaming: input.streaming,
    method: normalizedRequest.method,
    url: normalizedRequest.url,
    headers: sanitizeHeaders(normalizedRequest.headers),
    bodyText,
    bodyJson: parseBodyJson(bodyText)
  }
}

function sanitizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = SENSITIVE_HEADER_KEYS.has(key.toLowerCase()) ? REDACTED_HEADER_VALUE : value
  })
  return result
}

function parseBodyJson(bodyText: string | null): unknown | null {
  if (!bodyText) {
    return null
  }

  try {
    return JSON.parse(bodyText) as unknown
  } catch {
    return null
  }
}
