import { defineStandardOFNodeDefinition } from '../../node-definition'
import type { KnowledgeRetrievalNodeData } from './editor'
import { knowledgeRetrievalNodeCompiler } from './compiler'
import { knowledgeRetrievalNodeDescription } from './description'
import { knowledgeRetrievalNodeEditor } from './editor'
import { knowledgeRetrievalNodeErrorGuidance } from './error-guidance'
import { knowledgeRetrievalNodeMainPrompt } from './main-prompt'
import { knowledgeRetrievalNodeRuntimeDefinition } from './runtime'
import { knowledgeRetrievalNodeTomlDefinition } from './toml'

export const knowledgeRetrievalNodeDefinition =
  defineStandardOFNodeDefinition<KnowledgeRetrievalNodeData>({
    authoring: {
      token: 'knowledge-retrieval' as never,
      title: 'knowledge-retrieval',
      description: knowledgeRetrievalNodeDescription,
      mainPrompt: knowledgeRetrievalNodeMainPrompt,
      errorGuidance: knowledgeRetrievalNodeErrorGuidance,
      toml: knowledgeRetrievalNodeTomlDefinition
    },
    runtime: knowledgeRetrievalNodeRuntimeDefinition,
    editor: knowledgeRetrievalNodeEditor,
    compiler: knowledgeRetrievalNodeCompiler
  })

export type { KnowledgeRetrievalNodeData }
