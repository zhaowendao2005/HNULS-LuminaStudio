import type { NormalChatAgentGraphNodeId } from './states'
import type { NormalChatAgentGraphCallbacks, NormalChatAgentGraphRunResult } from './types'

export class NormalChatAgentGraphRunner {
  async run(callbacks: NormalChatAgentGraphCallbacks): Promise<NormalChatAgentGraphRunResult> {
    const visitedNodes: NormalChatAgentGraphNodeId[] = []
    let currentNode: NormalChatAgentGraphNodeId = 'prepare-round'
    let loopCount = 0

    while (true) {
      loopCount += 1
      if (loopCount > 128) {
        throw new Error('Normal chat agent graph exceeded the maximum loop count.')
      }

      visitedNodes.push(currentNode)

      if (currentNode === 'prepare-round') {
        await callbacks.prepareRound()
        currentNode = 'build-prompt'
        continue
      }

      if (currentNode === 'build-prompt') {
        await callbacks.buildPrompt()
        currentNode = 'invoke-model'
        continue
      }

      if (currentNode === 'invoke-model') {
        await callbacks.invokeModel()
        currentNode = 'parse-envelope'
        continue
      }

      if (currentNode === 'parse-envelope') {
        await callbacks.parseEnvelope()
        const state = callbacks.getState()
        if (state.reachedReactLimit) {
          currentNode = 'forced-finalize'
          continue
        }
        currentNode = state.hasActionsToExecute ? 'execute-actions' : 'finalize'
        continue
      }

      if (currentNode === 'execute-actions') {
        await callbacks.executeActions()
        currentNode = 'decide-next-round'
        continue
      }

      if (currentNode === 'decide-next-round') {
        const state = callbacks.getState()
        currentNode = state.shouldContinue ? 'prepare-round' : 'finalize'
        continue
      }

      if (currentNode === 'forced-finalize') {
        await callbacks.forcedFinalize()
        break
      }

      await callbacks.finalize()
      break
    }

    return { visitedNodes }
  }
}
