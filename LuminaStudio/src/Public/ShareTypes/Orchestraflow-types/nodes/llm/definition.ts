import type { OFLLMNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { llmNodeCompiler } from './compiler'
import { llmNodeDslDefinition } from './dsl'
import { llmNodeEditor } from './editor'
import { llmNodeLlmSpec } from './llm-spec'
import { llmNodeRuntimeDefinition } from './runtime'

export const llmNodeDefinition = defineStandardOFNodeDefinition<OFLLMNodeData>({
  dsl: llmNodeDslDefinition,
  llmSpec: llmNodeLlmSpec,
  runtime: llmNodeRuntimeDefinition,
  editor: llmNodeEditor,
  compiler: llmNodeCompiler
})
