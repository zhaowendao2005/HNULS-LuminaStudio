import type { OFIfElseNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { ifNodeCompiler } from './compiler'
import { ifNodeDslDefinition } from './dsl'
import { ifNodeEditor } from './editor'
import { ifNodeLlmSpec } from './llm-spec'
import { ifNodeRuntimeDefinition } from './runtime'

export const ifNodeDefinition = defineStandardOFNodeDefinition<OFIfElseNodeData>({
  dsl: ifNodeDslDefinition,
  llmSpec: ifNodeLlmSpec,
  runtime: ifNodeRuntimeDefinition,
  editor: ifNodeEditor,
  compiler: ifNodeCompiler
})
