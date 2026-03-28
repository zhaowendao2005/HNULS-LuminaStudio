import type {
  NormalChatAgentGraphCallbacks,
  NormalChatAgentGraphNodeId,
  NormalChatAgentGraphRunResult
} from './types'

// 极简 graph runner，按 start -> execute -> finish 顺序执行，保证流程是 if/else while 面向过程。
export class NormalChatAgentGraphRunner {
  run(callbacks: NormalChatAgentGraphCallbacks): NormalChatAgentGraphRunResult {
    const visitedNodes: NormalChatAgentGraphNodeId[] = []
    let currentNode: NormalChatAgentGraphNodeId = 'start'
    let iterationCount = 0

    // while 控制流程，保证 node 依序城市推进，超过 8 次视为死循环。
    while (currentNode !== 'finish') {
      iterationCount += 1
      if (iterationCount > 8) {
        throw new Error('Normal chat agent graph exceeded the maximum loop count.')
      }

      visitedNodes.push(currentNode)

      if (currentNode === 'start') {
        currentNode = 'execute'
        continue
      }

      if (currentNode === 'execute') {
        callbacks.execute()
        currentNode = 'finish'
        continue
      }
    }

    visitedNodes.push('finish')
    return { visitedNodes }
  }
}
