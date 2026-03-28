import { describe, expect, it, vi } from 'vitest'
import { NormalChatTaskScheduler } from './task-scheduler'

describe('NormalChatTaskScheduler', () => {
  it('registers and clears pending tasks', () => {
    const scheduler = new NormalChatTaskScheduler(
      { markInterruptedTasksFailed: vi.fn(), markAborted: vi.fn() } as never,
      { markInterruptedRunsFailed: vi.fn(), markAborted: vi.fn() } as never,
      { markInterruptedActionsFailed: vi.fn(), markAbortedByTask: vi.fn() } as never,
      { markInterruptedCallsFailed: vi.fn(), markAbortedByTask: vi.fn() } as never,
      { getByRequest: vi.fn(), updateResponseRecord: vi.fn() } as never,
      { publish: vi.fn() } as never
    )

    const controller = new AbortController()
    scheduler.registerPendingTask('request-1', 'task-1', 'topic-1', controller)

    expect(scheduler.hasPendingTask('request-1')).toBe(true)
    expect(scheduler.getPendingTaskCount()).toBe(1)

    scheduler.clearPendingTask('request-1')
    expect(scheduler.hasPendingTask('request-1')).toBe(false)
    expect(scheduler.getPendingTaskCount()).toBe(0)
  })

  it('aborts a pending task and emits finish', () => {
    const markAborted = vi.fn()
    const markAgentAborted = vi.fn()
    const markActionsAborted = vi.fn()
    const updateResponseRecord = vi.fn()
    const publish = vi.fn()

    const scheduler = new NormalChatTaskScheduler(
      { markInterruptedTasksFailed: vi.fn(), markAborted } as never,
      { markInterruptedRunsFailed: vi.fn(), markAborted: markAgentAborted } as never,
      { markInterruptedActionsFailed: vi.fn(), markAbortedByTask: markActionsAborted } as never,
      { markInterruptedCallsFailed: vi.fn(), markAbortedByTask: vi.fn() } as never,
      {
        getByRequest: vi.fn(() => ({
          requestId: 'request-1',
          topicId: 'topic-1',
          assistantId: 'assistant-1',
          assistantName: 'assistant',
          assistantEmoji: 'bot',
          topicTitle: 'topic',
          requestRecordJson: null,
          responseRecordJson: JSON.stringify({
            chunks: ['partial'],
            finalText: 'partial',
            aborted: false,
            errorMessage: null,
            completedAt: null
          }),
          runtimeTraceJson: null
        })),
        updateResponseRecord
      } as never,
      { publish } as never
    )

    const controller = new AbortController()
    scheduler.registerPendingTask('request-1', 'task-1', 'topic-1', controller)

    scheduler.abort('request-1')

    expect(controller.signal.aborted).toBe(true)
    expect(markAborted).toHaveBeenCalledWith('task-1', expect.any(String))
    expect(markAgentAborted).toHaveBeenCalledWith('task-1', expect.any(String))
    expect(markActionsAborted).toHaveBeenCalledWith('task-1', expect.any(String))
    expect(updateResponseRecord).toHaveBeenCalledWith(
      'request-1',
      expect.objectContaining({ aborted: true, finalText: 'partial' }),
      expect.any(String)
    )
    expect(publish).toHaveBeenCalledWith('task-1', 'topic-1', 'request-1', {
      type: 'finish',
      requestId: 'request-1',
      topicId: 'topic-1',
      assistantMessageId: null
    })
  })
})
