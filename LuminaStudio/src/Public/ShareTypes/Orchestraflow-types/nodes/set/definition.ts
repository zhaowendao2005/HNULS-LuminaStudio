import type { OFVariableAssignNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { variableAssignNodeCompiler } from './compiler'
import { variableAssignNodeDslDefinition } from './dsl'
import { variableAssignNodeEditor } from './editor'
import { variableAssignNodeLlmSpec } from './llm-spec'
import { variableAssignNodeRuntimeDefinition } from './runtime'

export const variableAssignNodeDefinition =
  defineStandardOFNodeDefinition<OFVariableAssignNodeData>({
    dsl: variableAssignNodeDslDefinition,
    llmSpec: variableAssignNodeLlmSpec,
    runtime: variableAssignNodeRuntimeDefinition,
    editor: variableAssignNodeEditor,
    compiler: variableAssignNodeCompiler
  })
