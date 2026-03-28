export type NormalChatAgentGraphNodeId = 'start' | 'execute' | 'finish'

export interface NormalChatAgentGraphCallbacks {
  execute(): void
}

export interface NormalChatAgentGraphRunResult {
  visitedNodes: NormalChatAgentGraphNodeId[]
}
