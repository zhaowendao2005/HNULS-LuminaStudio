import type { NormalChatScriptRoundInput } from '../model-adapter.interface'
import { buildPubmedFastEnvelope } from './scenarios/pubmed-fast'
import { buildPubmedSlowEnvelope } from './scenarios/pubmed-slow-full'

/**
 * @deprecated
 * This scripted router is detached from the normal-chat production path.
 * It remains only for isolated legacy verification and should not be referenced by runtime wiring.
 */
export function routeScriptedScenario(input: NormalChatScriptRoundInput): string {
  const pubmedAction = input.enabledActions.find(
    (action) => action.actionKey === 'functioncall.pubmed_search'
  )

  if (input.agentDepth > 0) {
    return JSON.stringify(buildPubmedFastEnvelope(input))
  }

  if (pubmedAction?.mode === 'slow') {
    return JSON.stringify(buildPubmedSlowEnvelope(input))
  }

  return JSON.stringify(buildPubmedFastEnvelope(input))
}
