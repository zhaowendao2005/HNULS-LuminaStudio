import type { NormalChatResolvedAction } from './action.types'

export class NormalChatLoadedActionSpecService {
  resolveLoadedActions(
    resolvedActions: NormalChatResolvedAction[],
    loadedActionKeys: ReadonlySet<string>
  ): NormalChatResolvedAction[] {
    return resolvedActions.filter((action) => {
      if (action.kind === 'system') {
        return true
      }

      if (action.mode === 'fast') {
        return true
      }

      return loadedActionKeys.has(action.actionKey)
    })
  }
}
