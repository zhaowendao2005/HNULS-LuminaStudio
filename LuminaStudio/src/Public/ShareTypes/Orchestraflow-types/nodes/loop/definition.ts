import type { OFLoopNodeData } from '../../core-types'
import { defineContainerOFNodeDefinition } from '../../node-definition'
import { loopNodeCompiler } from './compiler'
import { loopNodeDslDefinition } from './dsl'
import { loopNodeEditor } from './editor'
import { loopNodeLlmSpec } from './llm-spec'
import { loopNodeRuntimeDefinition } from './runtime'

export const loopNodeDefinition = defineContainerOFNodeDefinition<OFLoopNodeData>({
  dsl: loopNodeDslDefinition,
  llmSpec: loopNodeLlmSpec,
  runtime: loopNodeRuntimeDefinition,
  editor: loopNodeEditor,
  compiler: loopNodeCompiler
})
