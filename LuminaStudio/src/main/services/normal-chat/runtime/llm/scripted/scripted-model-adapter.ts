import type { NormalChatModelAdapter, NormalChatScriptRoundInput } from '../model-adapter.interface'
import { routeScriptedScenario } from './scenario-router'

/**
 * @deprecated
 * Scripted normal-chat LLM flow is no longer part of the production mainline.
 * Keep this adapter only as an isolated legacy test fixture until the whole scripted tree is removed.
 */
export class NormalChatScriptedModelAdapter implements NormalChatModelAdapter {
  async invokeRound(input: NormalChatScriptRoundInput): Promise<string> {
    return routeScriptedScenario(input)
  }
}
