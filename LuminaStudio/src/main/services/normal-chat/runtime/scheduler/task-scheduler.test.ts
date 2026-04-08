import { describe, expect, it, vi } from 'vitest'
import { NormalChatTaskScheduler } from './task-scheduler'

describe('NormalChatTaskScheduler', () => {
  it('registers and clears pending tasks', () => {
    const requestHeadsRepository = {
      listByStatuses: vi.fn(() => []),
      updateStatus: vi.fn()
    }
    const streamPublisher = {
      appendTraceEntry: vi.fn(),
      clearPersistence: vi.fn(),
      publish: vi.fn()
    }
    const scheduler = new NormalChatTaskScheduler(
      requestHeadsRepository as never,
      streamPublisher as never
    )

    const controller = new AbortController()
    scheduler.registerPendingTask('request-1', 'task-1', 'topic-1', controller)
    scheduler.clearPendingTask('request-1')

    expect(streamPublisher.clearPersistence).toHaveBeenCalledWith('request-1')
  })

  it('aborts a pending task and emits finish', async () => {
    const requestHeadsRepository = {
      listByStatuses: vi.fn(() => []),
      updateStatus: vi.fn()
    }
    const streamPublisher = {
      appendTraceEntry: vi.fn(),
      clearPersistence: vi.fn(),
      publish: vi.fn(() => 11)
    }
    const scheduler = new NormalChatTaskScheduler(
      requestHeadsRepository as never,
      streamPublisher as never
    )

    const controller = new AbortController()
    scheduler.registerPendingTask('request-1', 'task-1', 'topic-1', controller)

    const abortPromise = scheduler.abort('request-1')
    scheduler.clearPendingTask('request-1')
    await abortPromise

    expect(controller.signal.aborted).toBe(true)
    expect(requestHeadsRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-1',
        status: 'aborted',
        phase: 'finished'
      })
    )
    expect(streamPublisher.publish).toHaveBeenCalledWith('task-1', 'topic-1', 'request-1', {
      type: 'finish',
      requestId: 'request-1',
      topicId: 'topic-1',
      assistantMessageId: null
    })
    expect(streamPublisher.clearPersistence).toHaveBeenCalledWith('request-1')
  })

  it('fails a pending task and writes the trace failure event', () => {
    const requestHeadsRepository = {
      listByStatuses: vi.fn(() => []),
      updateStatus: vi.fn()
    }
    const streamPublisher = {
      appendTraceEntry: vi.fn(),
      clearPersistence: vi.fn(),
      publish: vi.fn(() => 12)
    }
    const scheduler = new NormalChatTaskScheduler(
      requestHeadsRepository as never,
      streamPublisher as never
    )

    scheduler.registerPendingTask('request-2', 'task-2', 'topic-2', new AbortController())
    scheduler.fail('request-2', '503 provider unavailable')

    expect(streamPublisher.appendTraceEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-2',
        entityKind: 'request',
        op: 'failed',
        payload: expect.objectContaining({
          kind: 'request_failed',
          message: '503 provider unavailable'
        }),
        updateHead: expect.objectContaining({
          status: 'failed',
          phase: 'finished',
          errorMessage: '503 provider unavailable'
        })
      })
    )
    expect(streamPublisher.publish).toHaveBeenCalledWith('task-2', 'topic-2', 'request-2', {
      type: 'error',
      requestId: 'request-2',
      topicId: 'topic-2',
      message: '503 provider unavailable',
      rawErrorJson: null
    })
    expect(streamPublisher.clearPersistence).toHaveBeenCalledWith('request-2')
  })
})
