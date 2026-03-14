import type { OFIterationStartNodeData } from '../../../core-types'
import { defineInternalStartOFNodeDefinition } from '../../../node-definition'
import { iterationStartNodeEditor } from './editor'
import { iterationStartNodeRuntimeDefinition } from './runtime'

export const iterationStartNodeDefinition =
  defineInternalStartOFNodeDefinition<OFIterationStartNodeData>({
    runtime: iterationStartNodeRuntimeDefinition,
    editor: iterationStartNodeEditor
  })
