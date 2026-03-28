export type NormalChatAgentGraphNodeId =
  | 'prepare-round'
  | 'build-prompt'
  | 'invoke-model'
  | 'parse-envelope'
  | 'execute-actions'
  | 'decide-next-round'
  | 'finalize'
  | 'forced-finalize'

export interface NormalChatAgentGraphState {
  node: NormalChatAgentGraphNodeId
  shouldContinue: boolean
  hasActionsToExecute: boolean
  reachedReactLimit: boolean
}
