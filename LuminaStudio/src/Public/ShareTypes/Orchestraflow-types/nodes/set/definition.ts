import type { OFVariableAssignNodeData } from '../../core-types'
import { defineStandardOFNodeDefinition } from '../../node-definition'
import { variableAssignNodeCompiler } from './compiler'
import { variableAssignNodeDescription } from './description'
import { variableAssignNodeEditor } from './editor'
import { variableAssignNodeErrorGuidance } from './error-guidance'
import { variableAssignNodeMainPrompt } from './main-prompt'
import { variableAssignNodeRuntimeDefinition } from './runtime'
import { variableAssignNodeTomlDefinition } from './toml'

export const variableAssignNodeDefinition =
  defineStandardOFNodeDefinition<OFVariableAssignNodeData>({
    authoring: {
      token: 'set',
      title: 'set',
      description: variableAssignNodeDescription,
      mainPrompt: variableAssignNodeMainPrompt,
      errorGuidance: variableAssignNodeErrorGuidance,
      toml: variableAssignNodeTomlDefinition,
      legacyTokens: ['variable-assign']
    },
    runtime: variableAssignNodeRuntimeDefinition,
    editor: variableAssignNodeEditor,
    compiler: variableAssignNodeCompiler
  })
