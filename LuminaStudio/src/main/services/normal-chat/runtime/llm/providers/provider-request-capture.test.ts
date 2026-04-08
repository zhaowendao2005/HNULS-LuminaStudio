import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NormalChatProviderConfig } from './provider-config.types'
import {
  createProviderRequestCaptureFetch,
  normalChatProviderRequestCaptureHandle
} from './provider-request-capture'

const config: NormalChatProviderConfig = {
  providerId: 'provider-1',
  modelId: 'gpt-4.1',
  protocol: 'openai-response',
  apiKey: 'secret',
  baseUrl: 'https://example.com/v1',
  defaultHeaders: {
    'x-extra-header': 'present'
  }
}

describe('normalChatProviderRequestCaptureHandle', () => {
  beforeEach(() => {
    normalChatProviderRequestCaptureHandle.clear()
  })

  it('captures and redacts outgoing provider requests', async () => {
    const baseFetch = vi.fn(async () => new Response('{}', { status: 200 }))
    const captureFetch = createProviderRequestCaptureFetch({
      config,
      streaming: false,
      baseFetch
    })

    await captureFetch?.('https://example.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer super-secret',
        'x-api-key': 'secret-key'
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        instructions: 'system',
        input: 'round'
      })
    })

    const latest = normalChatProviderRequestCaptureHandle.getLatest()
    expect(latest).not.toBeNull()
    expect(latest?.protocol).toBe('openai-response')
    expect(latest?.providerId).toBe('provider-1')
    expect(latest?.streaming).toBe(false)
    expect(latest?.method).toBe('POST')
    expect(latest?.headers.authorization).toBe('[redacted]')
    expect(latest?.headers['x-api-key']).toBe('[redacted]')
    expect(latest?.headers['content-type']).toBe('application/json')
    expect(latest?.bodyJson).toEqual({
      model: 'gpt-4.1',
      instructions: 'system',
      input: 'round'
    })
    expect(baseFetch).toHaveBeenCalledTimes(1)
  })

  it('keeps only the most recent captured requests', async () => {
    const baseFetch = vi.fn(async () => new Response('{}', { status: 200 }))
    const captureFetch = createProviderRequestCaptureFetch({
      config,
      streaming: true,
      baseFetch
    })

    for (let index = 0; index < 55; index += 1) {
      await captureFetch?.('https://example.com/v1/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ index })
      })
    }

    const snapshots = normalChatProviderRequestCaptureHandle.list()
    expect(snapshots).toHaveLength(50)
    expect(snapshots[0]?.bodyJson).toEqual({ index: 5 })
    expect(snapshots.at(-1)?.bodyJson).toEqual({ index: 54 })
  })
})
