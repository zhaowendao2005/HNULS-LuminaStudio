import { describe, expect, it, vi } from 'vitest'
import type { NormalChatProviderConfig } from './provider-config.types'
import { createProviderRequestCaptureFetch } from './provider-request-capture'

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

describe('normalChatProviderRequestCapture', () => {
  it('captures and redacts outgoing provider requests via callback', async () => {
    const baseFetch = vi.fn(async () => new Response('{}', { status: 200 }))
    const onCapture = vi.fn()
    const captureFetch = createProviderRequestCaptureFetch({
      config,
      streaming: false,
      captureContext: {
        requestId: 'request-1',
        modelCallId: 'model-call-1'
      },
      onCapture,
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

    expect(onCapture).toHaveBeenCalledTimes(1)
    const latest = onCapture.mock.calls[0]?.[0]
    expect(latest.requestId).toBe('request-1')
    expect(latest.modelCallId).toBe('model-call-1')
    expect(latest.protocol).toBe('openai-response')
    expect(latest.providerId).toBe('provider-1')
    expect(latest.streaming).toBe(false)
    expect(latest.method).toBe('POST')
    expect(latest.headers.authorization).toBe('[redacted]')
    expect(latest.headers['x-api-key']).toBe('[redacted]')
    expect(latest.headers['content-type']).toBe('application/json')
    expect(latest.bodyJson).toEqual({
      model: 'gpt-4.1',
      instructions: 'system',
      input: 'round'
    })
    expect(baseFetch).toHaveBeenCalledTimes(1)
  })
})
