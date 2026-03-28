import { getNormalChatActionDefinition } from '../../shared/action-registry'
import type { NormalChatGetActionSpecOutput } from '../../shared/action.types'

export class NormalChatGetActionSpecExecutor {
  execute(actionKey: string): NormalChatGetActionSpecOutput {
    const definition = getNormalChatActionDefinition(actionKey)
    if (!definition) {
      throw new Error(`Unknown action key: ${actionKey}`)
    }

    return {
      actionKey,
      definition
    }
  }
}
