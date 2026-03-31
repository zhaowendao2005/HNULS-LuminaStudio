import type { NormalChatTaskExecutionActionSnapshot } from '@preload/types'
import type { NormalChatResolvedAction } from './action.types'
import { getNormalChatActionDefinition } from './action-registry'

export class NormalChatActionResolutionService {
  resolveEnabledActionsFromSnapshot(
    actionSnapshots: NormalChatTaskExecutionActionSnapshot[]
  ): NormalChatResolvedAction[] {
    return actionSnapshots
      .map((action) => {
        const definition = getNormalChatActionDefinition(action.actionKey)
        if (!definition) {
          return null
        }

        return {
          actionKey: action.actionKey,
          kind: definition.descriptor.kind,
          enabled: true,
          mode: action.mode === 'slow' ? 'slow' : 'fast',
          definition
        } satisfies NormalChatResolvedAction
      })
      .filter((action): action is NormalChatResolvedAction => action !== null)
  }
}
