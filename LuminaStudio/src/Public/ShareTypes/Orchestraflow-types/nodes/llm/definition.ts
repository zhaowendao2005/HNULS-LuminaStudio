import type { OFLLMNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { llmNodeCompiler } from './compiler'
import { llmNodeDescription } from './description'
import { llmNodeEditor } from './editor'
import { llmNodeErrorGuidance } from './error-guidance'
import { llmNodeMainPrompt } from './main-prompt'
import { llmNodeRuntimeDefinition } from './runtime'
import { llmNodeTomlDefinition } from './toml'

export const llmNodeDefinition = defineStandardOFNodeDefinition<OFLLMNodeData>({
  authoring: {
    token: 'llm',
    title: 'llm',
    description: llmNodeDescription,
    mainPrompt: llmNodeMainPrompt,
    errorGuidance: llmNodeErrorGuidance,
    toml: llmNodeTomlDefinition
  },
  runtime: llmNodeRuntimeDefinition,
  editor: llmNodeEditor,
  compiler: llmNodeCompiler
})
