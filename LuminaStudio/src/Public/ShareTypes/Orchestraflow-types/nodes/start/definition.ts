import type { OFStartNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { startNodeCompiler } from './compiler'
import { startNodeDescription } from './description'
import { startNodeEditor } from './editor'
import { startNodeErrorGuidance } from './error-guidance'
import { startNodeMainPrompt } from './main-prompt'
import { startNodeRuntimeDefinition } from './runtime'
import { startNodeTomlDefinition } from './toml'

export const startNodeDefinition = defineStandardOFNodeDefinition<OFStartNodeData>({
  authoring: {
    token: 'start',
    title: '开始',
    description: startNodeDescription,
    mainPrompt: startNodeMainPrompt,
    errorGuidance: startNodeErrorGuidance,
    toml: startNodeTomlDefinition
  },
  runtime: startNodeRuntimeDefinition,
  editor: startNodeEditor,
  compiler: startNodeCompiler
})
