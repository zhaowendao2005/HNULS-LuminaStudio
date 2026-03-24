import { describe, expect, it } from 'vitest'
import { NormalChatRequestLifecycleManager } from './normal-chat-request-lifecycle'

function createTrackedRequest(topicId: string, requestId: string) {
  const controller = new AbortController()
  let resolveSettled: () => void = () => undefined
  const settled = new Promise<void>((resolve) => {
    resolveSettled = resolve
  })

  return {
    topicId,
    requestId,
    controller,
    settled,
    resolveSettled
  }
}

describe('NormalChatRequestLifecycleManager', () => {
  it('tracks active requests by topic', () => {
    const lifecycle = new NormalChatRequestLifecycleManager()
    const request = createTrackedRequest('topic-1', 'request-1')

    lifecycle.register(request)

    expect(lifecycle.getActiveRequestId('topic-1')).toBe('request-1')
  })

  it('aborts only the active request of the same topic', async () => {
    const lifecycle = new NormalChatRequestLifecycleManager()
    const first = createTrackedRequest('topic-1', 'request-1')
    const second = createTrackedRequest('topic-2', 'request-2')

    lifecycle.register(first)
    lifecycle.register(second)

    const abortPromise = lifecycle.abortTopicRequest('topic-1')
    expect(first.controller.signal.aborted).toBe(true)
    expect(second.controller.signal.aborted).toBe(false)

    lifecycle.finalize('request-1')

    await expect(abortPromise).resolves.toBe(true)
    expect(lifecycle.getActiveRequestId('topic-1')).toBeNull()
    expect(lifecycle.getActiveRequestId('topic-2')).toBe('request-2')
  })
})
