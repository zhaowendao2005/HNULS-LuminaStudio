import { getActionSpecActionDescriptor } from './descriptor'
import { getActionSpecActionPrompt } from './prompt'
import { getActionSpecActionSchema } from './schema'

export const getActionSpecActionDefinition = {
  descriptor: getActionSpecActionDescriptor,
  schema: getActionSpecActionSchema,
  prompt: getActionSpecActionPrompt
}

export * from './executor'
