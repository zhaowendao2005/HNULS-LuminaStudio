import type { OFLoopNodeData } from '../../core-types'
import { defineContainerOFNodeDefinition } from '../../node-definition'
import { loopNodeCompiler } from './compiler'
import { loopNodeDescription } from './description'
import { loopNodeEditor } from './editor'
import { loopNodeErrorGuidance } from './error-guidance'
import { loopNodeMainPrompt } from './main-prompt'
import { loopNodeRuntimeDefinition } from './runtime'
import { loopNodeTomlDefinition } from './toml'

export const loopNodeDefinition = defineContainerOFNodeDefinition<OFLoopNodeData>({
  authoring: {
    token: 'loop',
    title: 'loop',
    description: loopNodeDescription,
    mainPrompt: loopNodeMainPrompt,
    errorGuidance: loopNodeErrorGuidance,
    toml: loopNodeTomlDefinition
  },
  runtime: loopNodeRuntimeDefinition,
  editor: loopNodeEditor,
  compiler: loopNodeCompiler
})
