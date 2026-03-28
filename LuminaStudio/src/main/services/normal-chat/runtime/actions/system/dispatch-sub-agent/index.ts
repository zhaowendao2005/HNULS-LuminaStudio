import { dispatchSubAgentActionDescriptor } from './descriptor'
import { dispatchSubAgentActionPrompt } from './prompt'
import { dispatchSubAgentActionSchema } from './schema'

export const dispatchSubAgentActionDefinition = {
  descriptor: dispatchSubAgentActionDescriptor,
  schema: dispatchSubAgentActionSchema,
  prompt: dispatchSubAgentActionPrompt
}

export * from './executor'
export type { NormalChatDispatchSubAgentOutput } from '../../shared/action.types'
