import { pubmedSearchActionDescriptor } from './descriptor'
import { pubmedSearchActionPrompt } from './prompt'
import { pubmedSearchActionSchema } from './schema'

export const pubmedSearchActionDefinition = {
  descriptor: pubmedSearchActionDescriptor,
  schema: pubmedSearchActionSchema,
  prompt: pubmedSearchActionPrompt
}

export * from './executor'
export * from './paper-retrieval-adapter'
