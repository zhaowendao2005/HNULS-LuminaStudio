import { randomUUID } from 'node:crypto'
import type { ModelProviderProtocol } from '@preload/types'
import { nowIso } from '../../../shared/utils'
import type { NormalChatProviderConfig } from './provider-config.types'

const MAX_CAPTURED_PROVIDER_REQUESTS = 50
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

export interface NormalChatCapturedProviderRequestMatchInput {
  providerId: string
  modelId: string
  streaming: boolean
  createdAt: string
  startedAt?: string | null
}

type NormalChatProviderRequestCaptureListener = (
  snapshot: NormalChatCapturedProviderRequest
) => void

class NormalChatProviderRequestCaptureHandle {
  private readonly listeners = new Set<NormalChatProviderRequestCaptureListener>()

  private snapshots: NormalChatCapturedProviderRequest[] = []

  list(): NormalChatCapturedProviderRequest[] {
    return [...this.snapshots]
  }

  getLatest(): NormalChatCapturedProviderRequest | null {
    return this.snapshots.at(-1) ?? null
  }

  clear(): void {
    this.snapshots = []
  }

  subscribe(listener: NormalChatProviderRequestCaptureListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  push(snapshot: NormalChatCapturedProviderRequest): void {
    this.snapshots.push(snapshot)
    if (this.snapshots.length > MAX_CAPTURED_PROVIDER_REQUESTS) {
      this.snapshots.splice(0, this.snapshots.length - MAX_CAPTURED_PROVIDER_REQUESTS)
    }

    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch {
        // Keep capture side effects from blocking the actual provider request.
      }
    }
  }
}

export const normalChatProviderRequestCaptureHandle = new NormalChatProviderRequestCaptureHandle()

export function findBestCapturedProviderRequest(
  input: NormalChatCapturedProviderRequestMatchInput,
  snapshots = normalChatProviderRequestCaptureHandle.list()
): NormalChatCapturedProviderRequest | null {
  const targetTimestamp = Date.parse(input.startedAt ?? input.createdAt)
  if (!Number.isFinite(targetTimestamp)) {
    return null
  }

  let bestMatch: NormalChatCapturedProviderRequest | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const snapshot of snapshots) {
    if (snapshot.providerId !== input.providerId || snapshot.modelId !== input.modelId) {
      continue
    }
    if (snapshot.streaming !== input.streaming) {
      continue
    }

    const capturedTimestamp = Date.parse(snapshot.capturedAt)
    if (!Number.isFinite(capturedTimestamp)) {
      continue
    }

    const distance = Math.abs(capturedTimestamp - targetTimestamp)
    if (distance < bestDistance) {
      bestMatch = snapshot
      bestDistance = distance
    }
  }

  return bestMatch
}

export function createProviderRequestCaptureFetch(input: {
  config: Pick<NormalChatProviderConfig, 'modelId' | 'protocol' | 'providerId'>
  streaming: boolean
  baseFetch?: typeof fetch
}): typeof fetch | undefined {
  const baseFetch = input.baseFetch ?? globalThis.fetch?.bind(globalThis)
  if (!baseFetch) {
    return undefined
  }

  return async (requestInfo: RequestInfo | URL, requestInit?: RequestInit): Promise<Response> => {
    const snapshot = await buildCapturedRequestSnapshot(input, requestInfo, requestInit)
    if (snapshot) {
      normalChatProviderRequestCaptureHandle.push(snapshot)
    }
    return baseFetch(requestInfo, requestInit)
  }
}

async function buildCapturedRequestSnapshot(
  input: {
    config: Pick<NormalChatProviderConfig, 'modelId' | 'protocol' | 'providerId'>
    streaming: boolean
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
