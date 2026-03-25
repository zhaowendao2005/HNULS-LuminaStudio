import type { NormalChatAgentSessionState } from '../agent/contracts'

export function getPlannerStepLimit(session: NormalChatAgentSessionState): number {
  if (session.costMode === 'per_call') {
    return 2
  }

  return 4
}

export function canDispatchChild(session: NormalChatAgentSessionState): boolean {
  return session.depth < session.maxRecursionDepth
}
