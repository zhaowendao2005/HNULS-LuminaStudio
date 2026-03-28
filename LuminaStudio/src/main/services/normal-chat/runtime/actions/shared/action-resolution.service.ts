import type { NormalChatAssistant, NormalChatTopic } from '@preload/types'
import type { NormalChatResolvedAction } from './action.types'
import { getNormalChatActionDefinition } from './action-registry'

const SYSTEM_ACTION_KEYS = ['system.get_action_spec', 'system.dispatch_sub_agent'] as const
const PUBMED_ACTION_KEY = 'functioncall.pubmed_search'

export class NormalChatActionResolutionService {
  resolveEnabledActions(input: {
    assistant: NormalChatAssistant
    topic: NormalChatTopic
  }): NormalChatResolvedAction[] {
    const actions: NormalChatResolvedAction[] = []

    for (const actionKey of SYSTEM_ACTION_KEYS) {
      const definition = getNormalChatActionDefinition(actionKey)
      if (!definition) {
        continue
      }

      actions.push({
        actionKey,
        kind: definition.descriptor.kind,
        enabled: true,
        mode: 'fast',
        definition
      })
    }

    const pubmedDefinition = getNormalChatActionDefinition(PUBMED_ACTION_KEY)
    if (pubmedDefinition) {
      const enabled =
        input.topic.functionCallPubMedMode === 'override'
          ? (input.topic.functionCallPubMedEnabledOverride ??
            input.assistant.functionCallPubMedEnabled)
          : input.assistant.functionCallPubMedEnabled
      const mode =
        input.topic.functionCallPubMedExecutionMode === 'override'
          ? (input.topic.functionCallPubMedExecutionModeOverride ??
            input.assistant.functionCallPubMedMode)
          : input.assistant.functionCallPubMedMode

      actions.push({
        actionKey: PUBMED_ACTION_KEY,
        kind: pubmedDefinition.descriptor.kind,
        enabled,
        mode,
        definition: pubmedDefinition
      })
    }

    return actions.filter((action) => action.enabled)
  }
}
