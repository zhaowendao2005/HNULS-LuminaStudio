import { afterEach, describe, expect, it, vi } from 'vitest'
import { NormalChatTaskScheduler } from './task-scheduler'

const activeTimers: ReturnType<typeof setTimeout>[] = []

afterEach(() => {
  activeTimers.splice(0).forEach((timer) => clearTimeout(timer))
})

describe('NormalChatTaskScheduler', () => {
  it('registers and clears pending tasks', () => {
    const scheduler = new NormalChatTaskScheduler(
      { transaction: (callback: () => void) => callback } as never,
      { markInterruptedTasksFailed: vi.fn(), markAborted: vi.fn() } as never,
      { markInterruptedRunsFailed: vi.fn(), markAborted: vi.fn() } as never,
      { getByRequest: vi.fn(), updateResponseRecord: vi.fn() } as never,
      { publish: vi.fn() } as never
    )

    const timer = setTimeout(() => undefined, 1000)
    activeTimers.push(timer)

    scheduler.registerPendingTask('request-1', 'task-1', 'topic-1', [timer])
    expect(scheduler.hasPendingTask('request-1')).toBe(true)
    expect(scheduler.getPendingTaskCount()).toBe(1)

    scheduler.clearPendingTask('request-1')
    expect(scheduler.hasPendingTask('request-1')).toBe(false)
    expect(scheduler.getPendingTaskCount()).toBe(0)
  })

  it('aborts a pending task and emits finish', () => {
    const markAborted = vi.fn()
    const markAgentAborted = vi.fn()
    const updateResponseRecord = vi.fn()
    const publish = vi.fn()

    const scheduler = new NormalChatTaskScheduler(
      { transaction: (callback: () => void) => callback } as never,
      { markInterruptedTasksFailed: vi.fn(), markAborted } as never,
      { markInterruptedRunsFailed: vi.fn(), markAborted: markAgentAborted } as never,
      {
        getByRequest: vi.fn(() => ({
          requestId: 'request-1',
          topicId: 'topic-1',
          assistantId: 'assistant-1',
          assistantName: 'assistant',
          assistantEmoji: '🤖',
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

    const timer = setTimeout(() => undefined, 1000)
    activeTimers.push(timer)
    scheduler.registerPendingTask('request-1', 'task-1', 'topic-1', [timer])

    scheduler.abort('request-1')

    expect(markAborted).toHaveBeenCalledWith('task-1', expect.any(String))
    expect(markAgentAborted).toHaveBeenCalledWith('task-1', expect.any(String))
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
    expect(scheduler.hasPendingTask('request-1')).toBe(false)
  })
})
