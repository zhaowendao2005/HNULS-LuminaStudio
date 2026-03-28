import type { NormalChatScriptRoundInput } from '../model-adapter.interface'
import { buildPubmedFastEnvelope } from './scenarios/pubmed-fast'
import { buildPubmedSlowEnvelope } from './scenarios/pubmed-slow-full'

export function routeScriptedScenario(input: NormalChatScriptRoundInput): Record<string, unknown> {
  const pubmedAction = input.enabledActions.find(
    (action) => action.actionKey === 'functioncall.pubmed_search'
  )

  if (input.agentDepth > 0) {
    return buildPubmedFastEnvelope(input)
  }

  if (pubmedAction?.mode === 'slow') {
    return buildPubmedSlowEnvelope(input)
  }

  return buildPubmedFastEnvelope(input)
}
