import { describe, expect, it } from 'vitest'
import type { NormalChatRequestEntry } from '@preload/types'
import { RequestDetailProjector } from './request-detail.projector'

describe('RequestDetailProjector', () => {
  it('hydrates raw provider request by exact requestId and modelCallId', () => {
    const projector = new RequestDetailProjector()
    const entries: NormalChatRequestEntry[] = [
      {
        seq: 1,
        requestId: 'request-1',
        assistantId: 'assistant-1',
        topicId: 'topic-1',
        conversationId: 'conversation-1',
        entityKind: 'request',
        entityId: 'request-1',
        parentEntityId: null,
        op: 'created',
        visibility: 'internal',
        payloadJson: JSON.stringify({
          kind: 'request_created',
          assistant: { id: 'assistant-1', name: 'Assistant', emoji: 'A' },
          topic: { id: 'topic-1', title: 'Topic' },
          conversation: { id: 'conversation-1', title: 'Conversation' },
          request: { providerId: 'provider-openai', modelId: 'gpt-4.1', input: 'hello' },
          runtime: { systemPrompt: 'system', streamingEnabled: false },
          historyMessages: [],
          promptInjections: [],
          actions: [],
          createdAt: '2026-04-09T01:20:39.000Z'
        }),
        createdAt: '2026-04-09T01:20:39.000Z'
      },
      {
        seq: 2,
        requestId: 'request-1',
        assistantId: 'assistant-1',
        topicId: 'topic-1',
        conversationId: 'conversation-1',
        entityKind: 'model_call',
        entityId: 'model-call-1',
        parentEntityId: null,
        op: 'created',
        visibility: 'debug',
        payloadJson: JSON.stringify({
          kind: 'model_call_created',
          agentRunId: 'agent-run-1',
          turnKind: 'answer',
          producedActionCount: 0,
          consumedActionRunIds: [],
          synthesisRequired: false,
          depth: 0,
          roundIndex: 1,
          callIndexInAgent: 1,
          requestPayload: {
            providerId: 'provider-openai',
            modelId: 'gpt-4.1',
            streamingEnabled: false
          }
        }),
        createdAt: '2026-04-09T01:20:40.000Z'
      },
      {
        seq: 3,
        requestId: 'request-1',
        assistantId: 'assistant-1',
        topicId: 'topic-1',
        conversationId: 'conversation-1',
        entityKind: 'model_call',
        entityId: 'model-call-1',
        parentEntityId: null,
        op: 'patched',
        visibility: 'debug',
        payloadJson: JSON.stringify({
          kind: 'provider_request_captured',
          id: 'capture-1',
          capturedAt: '2026-04-09T01:20:40.050Z',
          requestId: 'request-1',
          modelCallId: 'model-call-1',
          protocol: 'openai-response',
          providerId: 'provider-openai',
          modelId: 'gpt-4.1',
          streaming: false,
          method: 'POST',
          url: 'https://example.com/v1/responses',
          headers: { 'content-type': 'application/json' },
          bodyText: '{"model":"gpt-4.1"}',
          bodyJson: { model: 'gpt-4.1' }
        }),
        createdAt: '2026-04-09T01:20:40.050Z'
      }
    ]

    const detail = projector.project({
      head: null,
      requestId: 'request-1',
      entries
    })

    expect(detail.modelCalls[0]?.rawProviderRequest).toEqual(
      expect.objectContaining({
        requestId: 'request-1',
        modelCallId: 'model-call-1',
        bodyJson: { model: 'gpt-4.1' }
      })
    )
  })
})
