import { getActionSpecActionDescriptor } from '../system/get-action-spec/descriptor'
import { getActionSpecActionPrompt } from '../system/get-action-spec/prompt'
import { getActionSpecActionSchema } from '../system/get-action-spec/schema'
import { dispatchSubAgentActionDescriptor } from '../system/dispatch-sub-agent/descriptor'
import { dispatchSubAgentActionPrompt } from '../system/dispatch-sub-agent/prompt'
import { dispatchSubAgentActionSchema } from '../system/dispatch-sub-agent/schema'
import { pubmedSearchActionDescriptor } from '../functioncall/pubmed-search/descriptor'
import { pubmedSearchActionPrompt } from '../functioncall/pubmed-search/prompt'
import { pubmedSearchActionSchema } from '../functioncall/pubmed-search/schema'
import type { NormalChatActionDefinition } from './action.types'

const getActionSpecActionDefinition: NormalChatActionDefinition = {
  descriptor: getActionSpecActionDescriptor,
  schema: getActionSpecActionSchema,
  prompt: getActionSpecActionPrompt
}

const dispatchSubAgentActionDefinition: NormalChatActionDefinition = {
  descriptor: dispatchSubAgentActionDescriptor,
  schema: dispatchSubAgentActionSchema,
  prompt: dispatchSubAgentActionPrompt
}

const pubmedSearchActionDefinition: NormalChatActionDefinition = {
  descriptor: pubmedSearchActionDescriptor,
  schema: pubmedSearchActionSchema,
  prompt: pubmedSearchActionPrompt
}

const ACTION_DEFINITIONS = new Map<string, NormalChatActionDefinition>([
  [getActionSpecActionDefinition.descriptor.key, getActionSpecActionDefinition],
  [dispatchSubAgentActionDefinition.descriptor.key, dispatchSubAgentActionDefinition],
  [pubmedSearchActionDefinition.descriptor.key, pubmedSearchActionDefinition]
])

export function listNormalChatActionDefinitions(): NormalChatActionDefinition[] {
  return Array.from(ACTION_DEFINITIONS.values())
}

export function getNormalChatActionDefinition(
  actionKey: string
): NormalChatActionDefinition | null {
  return ACTION_DEFINITIONS.get(actionKey) ?? null
}
