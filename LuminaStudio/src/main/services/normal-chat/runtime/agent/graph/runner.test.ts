import { describe, expect, it, vi } from 'vitest'
import { NormalChatAgentGraphRunner } from './runner'

describe('NormalChatAgentGraphRunner', () => {
  it('runs the minimal prepare/build/invoke/parse/finalize path in order', async () => {
    const runner = new NormalChatAgentGraphRunner()
    const callOrder: string[] = []
    const invokeModel = vi.fn(() => {
      callOrder.push('invoke-model')
    })

    const result = await runner.run({
      prepareRound: () => {
        callOrder.push('prepare-round')
      },
      buildPrompt: () => {
        callOrder.push('build-prompt')
      },
      invokeModel,
      parseEnvelope: () => {
        callOrder.push('parse-envelope')
      },
      executeActions: () => {
        callOrder.push('execute-actions')
      },
      finalize: () => {
        callOrder.push('finalize')
      },
      forcedFinalize: () => {
        callOrder.push('forced-finalize')
      },
      getState: () => ({
        node: 'decide-next-round',
        shouldContinue: false,
        hasActionsToExecute: false,
        reachedReactLimit: false
      })
    })

    expect(invokeModel).toHaveBeenCalledTimes(1)
    expect(callOrder).toEqual([
      'prepare-round',
      'build-prompt',
      'invoke-model',
      'parse-envelope',
      'finalize'
    ])
    expect(result.visitedNodes).toEqual([
      'prepare-round',
      'build-prompt',
      'invoke-model',
      'parse-envelope',
      'finalize'
    ])
  })
})
