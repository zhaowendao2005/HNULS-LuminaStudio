import type { NormalChatCallMode } from '@preload/types'
import type { NormalChatAgentSessionState } from '../../contracts'

export interface ResolveCallModeOptions {
  helperCount: number
  contextLength: number
  userForcedTool: boolean
}

export function resolveAgentCallMode(
  session: NormalChatAgentSessionState,
  options: ResolveCallModeOptions
): NormalChatCallMode {
  if (session.callMode !== 'auto') {
    return session.callMode
  }

  if (session.costMode === 'per_call') {
    return options.helperCount <= 1 && options.contextLength < 10 ? 'fast' : 'slow'
  }

  if (options.userForcedTool && options.helperCount <= 1) {
    return 'fast'
  }

  if (options.helperCount > 1 || options.contextLength > 12) {
    return 'slow'
  }

  return 'fast'
}
