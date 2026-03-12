import { describe, expect, it } from 'vitest'
import { mapMessage } from './generation-editor.mappers'

describe('generation-editor.mappers', () => {
  it('maps raw response and raw trace fields from row to message', () => {
    const message = mapMessage({
      id: 'message-1',
      session_id: 'session-1',
      channel_key: 'analysis-discussion',
      request_id: 'request-1',
      role: 'assistant',
      content: 'normalized visible content',
      status: 'final',
      provider_id: 'provider-1',
      model_id: 'model-1',
      error: null,
      usage_json: '{"total_tokens": 1}',
      meta_json: '{"mode":"planning"}',
      raw_response_text: 'raw llm output with markers',
      raw_trace_json: '[{"type":"response.output_text.delta","delta":"x"}]',
      created_at: '2026-03-13 00:00:00',
      updated_at: '2026-03-13 00:00:01'
    })

    expect(message.rawResponseText).toBe('raw llm output with markers')
    expect(message.rawTraceJson).toBe('[{"type":"response.output_text.delta","delta":"x"}]')
  })
})
