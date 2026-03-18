import { defineStandardOFNodeDefinition } from '../../node-definition'
import type { PaperRetrievalNodeData } from './editor'
import { paperRetrievalNodeCompiler } from './compiler'
import { paperRetrievalNodeDescription } from './description'
import { paperRetrievalNodeEditor } from './editor'
import { paperRetrievalNodeErrorGuidance } from './error-guidance'
import { paperRetrievalNodeMainPrompt } from './main-prompt'
import { paperRetrievalNodeRuntimeDefinition } from './runtime'
import { paperRetrievalNodeTomlDefinition } from './toml'

export const paperRetrievalNodeDefinition = defineStandardOFNodeDefinition<PaperRetrievalNodeData>({
  authoring: {
    token: 'paper-retrieval' as never,
    title: 'paper-retrieval',
    description: paperRetrievalNodeDescription,
    mainPrompt: paperRetrievalNodeMainPrompt,
    errorGuidance: paperRetrievalNodeErrorGuidance,
    toml: paperRetrievalNodeTomlDefinition
  },
  runtime: paperRetrievalNodeRuntimeDefinition,
  editor: paperRetrievalNodeEditor,
  compiler: paperRetrievalNodeCompiler
})

export type { PaperRetrievalNodeData }
