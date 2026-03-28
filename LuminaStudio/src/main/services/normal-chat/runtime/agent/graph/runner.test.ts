import { describe, expect, it, vi } from 'vitest'
import { NormalChatAgentGraphRunner } from './runner'

describe('NormalChatAgentGraphRunner', () => {
  it('runs the minimal start-execute-finish graph in order', () => {
    const runner = new NormalChatAgentGraphRunner()
    const execute = vi.fn()

    const result = runner.run({ execute })

    expect(execute).toHaveBeenCalledTimes(1)
    expect(result.visitedNodes).toEqual(['start', 'execute', 'finish'])
  })
})
