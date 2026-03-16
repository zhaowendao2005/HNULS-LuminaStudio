import type { OFEndNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { endNodeCompiler } from './compiler'
import { endNodeDescription } from './description'
import { endNodeEditor } from './editor'
import { endNodeErrorGuidance } from './error-guidance'
import { endNodeMainPrompt } from './main-prompt'
import { endNodeRuntimeDefinition } from './runtime'
import { endNodeTomlDefinition } from './toml'

export const endNodeDefinition = defineStandardOFNodeDefinition<OFEndNodeData>({
  authoring: {
    token: 'end',
    title: 'end',
    description: endNodeDescription,
    mainPrompt: endNodeMainPrompt,
    errorGuidance: endNodeErrorGuidance,
    toml: endNodeTomlDefinition
  },
  runtime: endNodeRuntimeDefinition,
  editor: endNodeEditor,
  compiler: endNodeCompiler
})
