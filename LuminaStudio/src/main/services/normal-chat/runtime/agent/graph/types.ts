import type { NormalChatAgentGraphNodeId, NormalChatAgentGraphState } from './states'

export interface NormalChatAgentGraphCallbacks {
  prepareRound(): void | Promise<void>
  buildPrompt(): void | Promise<void>
  invokeModel(): void | Promise<void>
  parseEnvelope(): void | Promise<void>
  executeActions(): void | Promise<void>
  finalize(): void | Promise<void>
  forcedFinalize(): void | Promise<void>
  getState(): NormalChatAgentGraphState
}

export interface NormalChatAgentGraphRunResult {
  visitedNodes: NormalChatAgentGraphNodeId[]
}
