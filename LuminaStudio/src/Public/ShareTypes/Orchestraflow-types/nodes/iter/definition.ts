import type { OFIterationNodeData } from '../../core-types'
import { defineContainerOFNodeDefinition } from '../../node-definition'
import { iterationNodeCompiler } from './compiler'
import { iterationNodeDescription } from './description'
import { iterationNodeEditor } from './editor'
import { iterationNodeErrorGuidance } from './error-guidance'
import { iterationNodeMainPrompt } from './main-prompt'
import { iterationNodeRuntimeDefinition } from './runtime'
import { iterationNodeTomlDefinition } from './toml'

export const iterationNodeDefinition = defineContainerOFNodeDefinition<OFIterationNodeData>({
  authoring: {
    token: 'iter',
    title: 'iter',
    description: iterationNodeDescription,
    mainPrompt: iterationNodeMainPrompt,
    errorGuidance: iterationNodeErrorGuidance,
    toml: iterationNodeTomlDefinition,
    legacyTokens: ['iteration']
  },
  runtime: iterationNodeRuntimeDefinition,
  editor: iterationNodeEditor,
  compiler: iterationNodeCompiler
})
