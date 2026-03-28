import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NormalChatConversationStreamEvent } from '@preload/types'
import {
  getNormalChatConversationDevDetailMockIdByRequestId,
  normalChatConversationMock,
  prepareNormalChatConversationDevScenario,
  resetNormalChatConversationMockState
} from './conversation.mock'

describe('normalChatConversationMock scripted playback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetNormalChatConversationMockState()
  })

  afterEach(() => {
    resetNormalChatConversationMockState()
    vi.useRealTimers()
  })

  it('replays the functioncall matrix scenario with mixed call statuses', async () => {
    const events: NormalChatConversationStreamEvent[] = []
    const dispose = normalChatConversationMock.onStream((event) => {
      events.push(event)
    })

    prepareNormalChatConversationDevScenario('topic-1', 'functioncall-matrix')
    const accepted = await normalChatConversationMock.sendMessage({
      topicId: 'topic-1',
      providerId: 'provider-openai',
      modelId: 'gpt-4o-mini',
      input: 'Search literature, cross-check it, and summarize what matters for the UI.'
    })

    await vi.runAllTimersAsync()

    const detail = await normalChatConversationMock.getConversationTurnDetail({
      requestId: accepted.requestId
    })
    const functionCallParts =
      detail?.messages
        .find((message) => message.role === 'assistant')
        ?.parts.filter((part) => part.kind === 'functioncall') ?? []

    expect(events.filter((event) => event.type === 'assistant-part-upsert')).toHaveLength(6)
    expect(events.some((event) => event.type === 'finish')).toBe(true)
    expect(functionCallParts).toHaveLength(5)
    expect(functionCallParts.some((part) => part.status === 'running')).toBe(true)
    expect(functionCallParts.some((part) => part.status === 'error')).toBe(true)
    expect(functionCallParts.some((part) => part.status === 'aborted')).toBe(true)
    expect(getNormalChatConversationDevDetailMockIdByRequestId(accepted.requestId)).toBe(
      'detail-functioncall-matrix'
    )

    dispose()
  })

  it('replays the agent hierarchy scenario with runtime trace updates and fallback state', async () => {
    const events: NormalChatConversationStreamEvent[] = []
    const dispose = normalChatConversationMock.onStream((event) => {
      events.push(event)
    })

    prepareNormalChatConversationDevScenario('topic-2', 'agent-hierarchy')
    const accepted = await normalChatConversationMock.sendMessage({
      topicId: 'topic-2',
      providerId: 'provider-openai',
      modelId: 'gpt-4o-mini',
      input:
        'Break this task apart, delegate collection, retry one failed branch, and then summarize.'
    })

    await vi.runAllTimersAsync()

    const detail = await normalChatConversationMock.getConversationTurnDetail({
      requestId: accepted.requestId
    })
    const runtimeTraceEvents = events.filter((event) => event.type === 'runtime-trace-upsert')
    const agentTree = detail?.runtimeTrace?.agentTree as
      | { rootAgentId: string; fallbackTriggered: boolean; agents: Record<string, unknown> }
      | undefined

    expect(runtimeTraceEvents).toHaveLength(3)
    expect(agentTree?.rootAgentId).toContain('-root')
    expect(agentTree?.fallbackTriggered).toBe(true)
    expect(detail?.responseRecord?.finalText).toContain('multi-level agent tree')

    dispose()
  })

  it('emits an error for the interrupt scenario without committing a final assistant message', async () => {
    const events: NormalChatConversationStreamEvent[] = []
    const dispose = normalChatConversationMock.onStream((event) => {
      events.push(event)
    })

    prepareNormalChatConversationDevScenario('topic-3', 'request-interrupt')
    const accepted = await normalChatConversationMock.sendMessage({
      topicId: 'topic-3',
      providerId: 'provider-openai',
      modelId: 'gpt-4o-mini',
      input: 'Start a long task, interrupt it halfway, and expose the request error path.'
    })

    await vi.runAllTimersAsync()

    const detail = await normalChatConversationMock.getConversationTurnDetail({
      requestId: accepted.requestId
    })

    expect(events.some((event) => event.type === 'error')).toBe(true)
    expect(events.some((event) => event.type === 'message-committed')).toBe(false)
    expect(detail?.responseRecord?.errorMessage).toContain('interrupted')
    expect(getNormalChatConversationDevDetailMockIdByRequestId(accepted.requestId)).toBe(
      'detail-request-interrupt'
    )

    dispose()
  })

  it('uses different prepared scenarios for consecutive requests on the same topic', async () => {
    prepareNormalChatConversationDevScenario('topic-4', 'streaming-baseline')
    const firstAccepted = await normalChatConversationMock.sendMessage({
      topicId: 'topic-4',
      providerId: 'provider-openai',
      modelId: 'gpt-4o-mini',
      input: 'Explain what this frontend-only chatflow playback is for in one concise answer.'
    })

    await vi.runAllTimersAsync()

    prepareNormalChatConversationDevScenario('topic-4', 'agent-hierarchy')
    const secondAccepted = await normalChatConversationMock.sendMessage({
      topicId: 'topic-4',
      providerId: 'provider-openai',
      modelId: 'gpt-4o-mini',
      input: 'Break this task apart, delegate collection, retry one failed branch, and then summarize.'
    })

    await vi.runAllTimersAsync()

    const firstDetail = await normalChatConversationMock.getConversationTurnDetail({
      requestId: firstAccepted.requestId
    })
    const secondDetail = await normalChatConversationMock.getConversationTurnDetail({
      requestId: secondAccepted.requestId
    })

    expect(firstDetail?.responseRecord?.finalText).toContain('normal streaming path')
    expect(secondDetail?.responseRecord?.finalText).toContain('multi-level agent tree')
    expect(getNormalChatConversationDevDetailMockIdByRequestId(firstAccepted.requestId)).toBe(
      'detail-streaming-baseline'
    )
    expect(
      getNormalChatConversationDevDetailMockIdByRequestId(secondAccepted.requestId)
    ).toBe('detail-agent-hierarchy')
  })
})
