import type { OFLoopStartNodeData } from '../../../core-types'
import { defineInternalStartOFNodeDefinition } from '../../../node-definition'
import { loopStartNodeEditor } from './editor'
import { loopStartNodeRuntimeDefinition } from './runtime'

export const loopStartNodeDefinition = defineInternalStartOFNodeDefinition<OFLoopStartNodeData>({
  runtime: loopStartNodeRuntimeDefinition,
  editor: loopStartNodeEditor
})
