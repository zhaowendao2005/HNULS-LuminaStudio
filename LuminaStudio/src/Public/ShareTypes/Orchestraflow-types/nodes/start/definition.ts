import type { OFStartNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { startNodeCompiler } from './compiler'
import { startNodeDslDefinition } from './dsl'
import { startNodeEditor } from './editor'
import { startNodeLlmSpec } from './llm-spec'
import { startNodeRuntimeDefinition } from './runtime'

export const startNodeDefinition = defineStandardOFNodeDefinition<OFStartNodeData>({
  dsl: startNodeDslDefinition,
  llmSpec: startNodeLlmSpec,
  runtime: startNodeRuntimeDefinition,
  editor: startNodeEditor,
  compiler: startNodeCompiler
})
