import type { OFEndNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { endNodeCompiler } from './compiler'
import { endNodeDslDefinition } from './dsl'
import { endNodeEditor } from './editor'
import { endNodeLlmSpec } from './llm-spec'
import { endNodeRuntimeDefinition } from './runtime'

export const endNodeDefinition = defineStandardOFNodeDefinition<OFEndNodeData>({
  dsl: endNodeDslDefinition,
  llmSpec: endNodeLlmSpec,
  runtime: endNodeRuntimeDefinition,
  editor: endNodeEditor,
  compiler: endNodeCompiler
})
