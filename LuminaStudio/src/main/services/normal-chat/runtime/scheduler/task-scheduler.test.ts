import { describe, expect, it, vi } from 'vitest'
import { NormalChatTaskScheduler } from './task-scheduler'

describe('NormalChatTaskScheduler', () => {
  it('registers and clears pending tasks', () => {
    const scheduler = new NormalChatTaskScheduler(
      { markInterruptedTasksFailed: vi.fn(), markAborted: vi.fn(), markFailed: vi.fn() } as never,
      { markInterruptedRunsFailed: vi.fn(), markAbortedByTask: vi.fn() } as never,
      { markInterruptedActionsFailed: vi.fn(), markAbortedByTask: vi.fn() } as never,
      { markInterruptedCallsFailed: vi.fn(), markAbortedByTask: vi.fn() } as never,
      { publish: vi.fn() } as never
    )

    const controller = new AbortController()
    scheduler.registerPendingTask('request-1', 'task-1', 'topic-1', controller)
    scheduler.clearPendingTask('request-1')
  })

  it('aborts a pending task and emits finish', () => {
    const markAborted = vi.fn()
    const markAgentAborted = vi.fn()
    const markActionsAborted = vi.fn()
    const markModelCallsAborted = vi.fn()
    const publish = vi.fn().mockReturnValueOnce(11)

    const scheduler = new NormalChatTaskScheduler(
      { markInterruptedTasksFailed: vi.fn(), markAborted } as never,
      { markInterruptedRunsFailed: vi.fn(), markAbortedByTask: markAgentAborted } as never,
      { markInterruptedActionsFailed: vi.fn(), markAbortedByTask: markActionsAborted } as never,
      { markInterruptedCallsFailed: vi.fn(), markAbortedByTask: markModelCallsAborted } as never,
      { publish } as never
    )

    const controller = new AbortController()
    scheduler.registerPendingTask('request-1', 'task-1', 'topic-1', controller)

    scheduler.abort('request-1')

    expect(controller.signal.aborted).toBe(true)
    expect(markAgentAborted).toHaveBeenCalledWith('task-1', expect.any(String))
    expect(markActionsAborted).toHaveBeenCalledWith('task-1', expect.any(String))
    expect(markModelCallsAborted).toHaveBeenCalledWith('task-1', expect.any(String))
    expect(markAborted).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ aborted: true, assistantMessageId: null }),
      11,
      expect.any(String)
    )
    expect(publish).toHaveBeenCalledWith('task-1', 'topic-1', 'request-1', {
      type: 'finish',
      requestId: 'request-1',
      topicId: 'topic-1',
      assistantMessageId: null
    })
  })

  it('fails a pending task and writes the error to task final response', () => {
    const markFailed = vi.fn()
    const publish = vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(12)

    const scheduler = new NormalChatTaskScheduler(
      { markInterruptedTasksFailed: vi.fn(), markFailed } as never,
      { markInterruptedRunsFailed: vi.fn(), markAbortedByTask: vi.fn() } as never,
      { markInterruptedActionsFailed: vi.fn(), markAbortedByTask: vi.fn() } as never,
      { markInterruptedCallsFailed: vi.fn(), markAbortedByTask: vi.fn() } as never,
      { publish } as never
    )

    scheduler.registerPendingTask('request-2', 'task-2', 'topic-2', new AbortController())

    scheduler.fail('request-2', '503 provider unavailable')

    expect(markFailed).toHaveBeenCalledWith(
      'task-2',
      '503 provider unavailable',
      expect.objectContaining({
        finalText: '',
        aborted: false,
        errorMessage: '503 provider unavailable'
      }),
      12,
      expect.any(String)
    )
    expect(publish).toHaveBeenNthCalledWith(1, 'task-2', 'topic-2', 'request-2', {
      type: 'error',
      requestId: 'request-2',
      topicId: 'topic-2',
      message: '503 provider unavailable',
      rawErrorJson: null
    })
    expect(publish).toHaveBeenNthCalledWith(2, 'task-2', 'topic-2', 'request-2', {
      type: 'finish',
      requestId: 'request-2',
      topicId: 'topic-2',
      assistantMessageId: null
    })
  })
})
