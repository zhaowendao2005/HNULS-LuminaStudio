import { knowledgeRetrievalActionDescriptor } from './descriptor'
import { knowledgeRetrievalActionPrompt } from './prompt'
import { knowledgeRetrievalActionSchema } from './schema'

export const knowledgeRetrievalActionDefinition = {
  descriptor: knowledgeRetrievalActionDescriptor,
  schema: knowledgeRetrievalActionSchema,
  prompt: knowledgeRetrievalActionPrompt
}

export * from './adapter'
export * from './executor'
