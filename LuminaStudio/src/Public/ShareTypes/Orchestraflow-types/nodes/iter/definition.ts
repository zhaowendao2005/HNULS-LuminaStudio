import type { OFIterationNodeData } from '../../core-types'
import { defineContainerOFNodeDefinition } from '../../node-definition'
import { iterationNodeCompiler } from './compiler'
import { iterationNodeDslDefinition } from './dsl'
import { iterationNodeEditor } from './editor'
import { iterationNodeLlmSpec } from './llm-spec'
import { iterationNodeRuntimeDefinition } from './runtime'

export const iterationNodeDefinition = defineContainerOFNodeDefinition<OFIterationNodeData>({
  dsl: iterationNodeDslDefinition,
  llmSpec: iterationNodeLlmSpec,
  runtime: iterationNodeRuntimeDefinition,
  editor: iterationNodeEditor,
  compiler: iterationNodeCompiler
})
